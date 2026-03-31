import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import { colors, radii, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import { chatDesigns } from '../api/ai';
import type { NavigationProp } from '@react-navigation/native';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  images?: string[];
  designs?: {
    id: string;
    designNo?: string;
    jewelryGroup?: string;
    collection?: string;
    goldColour?: string;
  }[];
};

const QUICK_QUESTIONS = [
  'Search ring designs',
  'Show the lowest price ring design',
  'Which designs have lab diamonds?',
  'Show bracelet designs with rose gold',
];

const AiChatScreen = () => {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<ChatMessage> | null>(null);
  const navigation = useNavigation<NavigationProp<any>>();

  const canSend = input.trim().length > 0 && !loading;
  const canClear = messages.length > 0 && !loading;

  const sendMessage = useCallback(
    async (rawMessage: string) => {
      if (!token || loading) return;
      const content = rawMessage.trim();
      if (!content) return;

      const newMessage: ChatMessage = {
        id: `${Date.now()}-user`,
        role: 'user',
        text: content,
      };
      setMessages((prev) => [...prev, newMessage]);
      setInput('');
      setLoading(true);

      try {
        const response = await chatDesigns(token, {
          message: content,
          companyId: user?.companyId || undefined,
          branchId: user?.branchId || undefined,
          limit: 5,
        });
        const images = Array.from(
          new Set(
            (response.designs || [])
              .flatMap((design: any) => design.imageUrls || [])
              .filter(Boolean),
          ),
        ).slice(0, 6);

        const designList = (response.designs || []).map((design: any) => ({
          id: design.id,
          designNo: design.designNo,
          jewelryGroup: design.jewelryGroup,
          collection: design.collection,
          goldColour: design.goldColour,
        }));

        const assistantMessage: ChatMessage = {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          text: response.reply,
          images: images?.length ? images : undefined,
          designs: designList.length ? designList : undefined,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err: any) {
        const assistantMessage: ChatMessage = {
          id: `${Date.now()}-assistant-error`,
          role: 'assistant',
          text: err?.message || 'Unable to fetch a response. Please try again.',
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } finally {
        setLoading(false);
      }
    },
    [loading, token, user?.companyId, user?.branchId],
  );

  const handleSend = async () => {
    if (!canSend) return;
    await sendMessage(input);
  };

  const listEmpty = useMemo(
    () => (
      <Card>
        <Text style={styles.emptyTitle}>Try one of these</Text>
        <Text style={styles.emptyText}>Tap any question to start.</Text>
        <View style={styles.quickQuestionWrap}>
          {QUICK_QUESTIONS.map((question) => (
            <TouchableOpacity
              key={question}
              style={[styles.quickQuestionChip, loading ? styles.quickQuestionChipDisabled : null]}
              onPress={() => sendMessage(question)}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.quickQuestionText}>{question}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>
    ),
    [loading, sendMessage],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <ChatBubble
        item={item}
        onPressDesign={(designId) =>
          navigation.navigate('DesignsTab', {
            screen: 'DesignDetail',
            params: { designId },
          })
        }
      />
    ),
    [navigation],
  );

  return (
    <Screen>
      <ScreenHeader
        title="AI"
        subtitle="Design assistant"
        rightSlot={
          <TouchableOpacity
            onPress={() => setMessages([])}
            disabled={!canClear}
            style={[styles.clearButton, !canClear ? styles.clearDisabled : null]}
          >
            <Ionicons
              name="trash-outline"
              size={16}
              color={canClear ? 'rgba(255, 252, 245, 0.94)' : 'rgba(255, 252, 245, 0.75)'}
            />
            <Text style={[styles.clearText, !canClear ? styles.clearTextDisabled : null]}>Clear</Text>
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={listEmpty}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask about a design..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity style={[styles.sendButton, !canSend ? styles.sendDisabled : null]} onPress={handleSend}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  listContent: {
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyText: {
    color: colors.textMuted,
  },
  quickQuestionWrap: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  quickQuestionChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  quickQuestionChipDisabled: {
    opacity: 0.5,
  },
  quickQuestionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '82%',
    padding: spacing.md,
    borderRadius: 12,
  },
  userBubble: {
    backgroundColor: colors.primary,
  },
  assistantBubble: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: colors.text,
  },
  imageGrid: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  imageThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  designList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  designItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  designTitle: {
    fontFamily: 'serif',
    fontWeight: '700',
    color: colors.text,
  },
  designMeta: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 12,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#fff',
    maxHeight: 120,
    color: colors.text,
  },
  sendButton: {
    backgroundColor: colors.primaryDark,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.5,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: '#2C1E16',
    backgroundColor: '#2C1E16',
  },
  clearDisabled: {
    opacity: 0.45,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 252, 245, 0.94)',
  },
  clearTextDisabled: {
    color: 'rgba(255, 252, 245, 0.75)',
  },
});

const ChatBubble = React.memo(
  ({
    item,
    onPressDesign,
  }: {
    item: ChatMessage;
    onPressDesign: (designId: string) => void;
  }) => {
    const hasDesignTiles = item.role === 'assistant' && Boolean(item.designs?.length);
    return (
      <View style={[styles.messageRow, item.role === 'user' ? styles.messageRowRight : null]}>
        <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
          {!hasDesignTiles ? (
            <Text style={[styles.messageText, item.role === 'user' ? styles.userText : styles.assistantText]}>
              {item.text}
            </Text>
          ) : null}

          {!hasDesignTiles && item.images && item.images.length ? (
            <View style={styles.imageGrid}>
              {item.images.map((uri, index) => (
                <Image key={`${uri}-${index}`} source={{ uri }} style={styles.imageThumb} />
              ))}
            </View>
          ) : null}

          {item.designs && item.designs.length ? (
            <View style={styles.designList}>
              {item.designs.map((design) => (
                <TouchableOpacity
                  key={design.id}
                  style={styles.designItem}
                  onPress={() => onPressDesign(design.id)}
                >
                  <Text style={styles.designTitle}>{design.designNo || 'Design'}</Text>
                  <Text style={styles.designMeta}>
                    {[design.jewelryGroup, design.collection, design.goldColour].filter(Boolean).join(' • ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    );
  },
);
ChatBubble.displayName = 'ChatBubble';

export default AiChatScreen;


