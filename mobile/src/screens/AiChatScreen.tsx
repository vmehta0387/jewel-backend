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
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  'Find lab diamond eternity rings',
  'What is the status of my recent orders?',
  'Quote price for design RING-0001',
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
      <View style={styles.quickQuestionCard}>
        <Ionicons name="sparkles" size={20} color="#DDB153" style={styles.emptyIcon} />
        <Text style={styles.emptyTitle}>Start your session</Text>
        <Text style={styles.emptyText}>Tap any question to see AI in action.</Text>
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
      </View>
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
    <View style={styles.screen}>
      <LinearGradient colors={['#FCFAF8', '#F5EBE1', '#E8D5C4']} style={StyleSheet.absoluteFillObject} />
      
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Custom Header */}
        <View style={styles.customHeader}>
          <View style={styles.logoWrapRow}>
            <View style={styles.darkLogoBlock}>
              <Ionicons name="flash-sharp" size={20} color="#DDB153" />
            </View>
            <View style={styles.headTextGroup}>
              <Text style={styles.headBlitz}>Blitz AI</Text>
              <Text style={styles.headSub}>Your 24/7 sales weapon</Text>
            </View>
          </View>
          <View style={styles.topRightControls}>
            <TouchableOpacity 
              style={[styles.clearBtn, !canClear ? styles.clearBtnDisabled : null]} 
              onPress={() => setMessages([])} 
              disabled={!canClear}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={20} color={canClear ? '#2C1E16' : '#A79F93'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.callAgentBtn} activeOpacity={0.8}>
              <Text style={styles.callAgentText}>Call{'\n'}agent</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.headerDivider} />

        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />

          <View style={styles.inputArea}>
            <View style={styles.inputPill}>
              <TextInput
                style={styles.input}
                placeholder="Ask me anything · I never sleep"
                placeholderTextColor="#A79687"
                value={input}
                onChangeText={setInput}
                multiline
              />
            </View>
            <TouchableOpacity style={[styles.sendButton, !canSend ? styles.sendDisabled : null]} onPress={handleSend} activeOpacity={0.88}>
              <Ionicons name="flash-sharp" size={20} color="#DDB153" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const ChatBubble = React.memo(
  ({
    item,
    onPressDesign,
  }: {
    item: ChatMessage;
    onPressDesign: (designId: string) => void;
  }) => {
    const isAI = item.role === 'assistant';
    const hasDesignTiles = isAI && Boolean(item.designs?.length);

    return (
      <View style={[styles.messageRow, isAI ? styles.messageRowLeft : styles.messageRowRight]}>
        {isAI && (
          <View style={styles.aiAvatarSmall}>
            <Ionicons name="flash-sharp" size={14} color="#DDB153" />
          </View>
        )}
        
        <View style={[styles.bubble, isAI ? styles.aiBubble : styles.userBubble]}>
          {!hasDesignTiles ? (
            <Text style={[styles.messageText, isAI ? styles.aiText : styles.userText]}>
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
                  activeOpacity={0.9}
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAF5ED',
  },
  safe: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoWrapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  darkLogoBlock: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#1E1711',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  onlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34A853',
    borderWidth: 2,
    borderColor: '#FCFAF8',
  },
  headTextGroup: {
    justifyContent: 'center',
  },
  headBlitz: {
    fontFamily: 'serif',
    fontSize: 20,
    fontWeight: '700',
    color: '#2C1E16',
  },
  headSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8276',
    fontStyle: 'italic',
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellBtn: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  bellIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#F3EFEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  redBadge: {
    position: 'absolute',
    top: -4,
    right: -2,
    backgroundColor: '#D14848',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FCFAF8',
  },
  redBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  callAgentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#DCC8B2',
    backgroundColor: '#FDFBF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callAgentText: {
    fontSize: 11,
    lineHeight: 12,
    color: '#6A5F56',
    fontWeight: '700',
    textAlign: 'center',
  },
  clearBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3EFEA',
    borderWidth: 1.5,
    borderColor: '#DCC8B2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnDisabled: {
    opacity: 0.5,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#E8DFD5',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: '#FCFAF8',
    borderTopWidth: 1,
    borderTopColor: '#E8DFD5',
  },
  inputPill: {
    flex: 1,
    backgroundColor: '#F3EFEA',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 46,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#DCC8B2',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#2C1E16',
    fontStyle: 'italic',
    padding: 0,
    margin: 0,
    lineHeight: 20,
  },
  sendButton: {
    backgroundColor: '#1E1711',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  sendDisabled: {
    opacity: 0.4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
    flexGrow: 1,
  },
  quickQuestionCard: {
    marginTop: 16,
    backgroundColor: '#FDFBF9',
    borderColor: '#DCC8B2',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  emptyIcon: {
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '700',
    color: '#2C1E16',
    marginBottom: 4,
  },
  emptyText: {
    color: '#8E8276',
    fontSize: 13,
  },
  quickQuestionWrap: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickQuestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DCC8B2',
    backgroundColor: '#FAF5ED',
  },
  quickQuestionChipDisabled: {
    opacity: 0.5,
  },
  quickQuestionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6A5F56',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  aiAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#1E1711',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#1E1711',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#FDFBF9',
    borderWidth: 1,
    borderColor: '#DCC8B2',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
    fontWeight: '400',
  },
  aiText: {
    color: '#2C1E16',
    fontWeight: '400',
  },
  imageGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageThumb: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#E8DFD5',
  },
  designList: {
    marginTop: 10,
    gap: 8,
  },
  designItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#FCFAF8',
    borderWidth: 1,
    borderColor: '#DCC8B2',
  },
  designTitle: {
    fontFamily: 'serif',
    fontWeight: '700',
    color: '#2C1E16',
    fontSize: 15,
  },
  designMeta: {
    marginTop: 2,
    color: '#8E8276',
    fontSize: 12,
  },
});

export default AiChatScreen;
