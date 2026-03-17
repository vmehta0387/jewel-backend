import React, { useMemo, useRef, useState } from 'react';
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
import Ionicons from '@expo/vector-icons/Ionicons';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import { colors, radii, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import { chatDesigns } from '../api/ai';
import { formatCurrency } from '../utils/format';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  images?: string[];
};

const AiChatScreen = () => {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<ChatMessage> | null>(null);

  const canSend = input.trim().length > 0 && !loading;

  const handleSend = async () => {
    if (!token || !canSend) return;
    const content = input.trim();
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
      const images = response.designs
        ?.flatMap((design) => design.imageUrls || [])
        .filter(Boolean)
        .slice(0, 6);

      const priceHint = response.designs?.[0]?.pricing?.finalPrice;
      const priceLine = typeof priceHint === 'number' ? `\n\nPrice: ${formatCurrency(priceHint)}` : '';

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        text: `${response.reply}${priceLine}`,
        images: images?.length ? images : undefined,
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
  };

  const listEmpty = useMemo(
    () => (
      <Card>
        <Text style={styles.emptyTitle}>Ask about any design</Text>
        <Text style={styles.emptyText}>
          Try “Show me a ring with round diamonds” or “What is the price for BL‑0002 with my branch pricing?”
        </Text>
      </Card>
    ),
    [],
  );

  return (
    <Screen>
      <ScreenHeader title="AI" subtitle="Design assistant" />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.messageRow, item.role === 'user' ? styles.messageRowRight : null]}>
              <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                <Text style={[styles.messageText, item.role === 'user' ? styles.userText : styles.assistantText]}>
                  {item.text}
                </Text>
                {item.images && item.images.length ? (
                  <View style={styles.imageGrid}>
                    {item.images.map((uri) => (
                      <Image key={uri} source={{ uri }} style={styles.imageThumb} />
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={listEmpty}
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyText: {
    color: colors.textMuted,
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
    borderRadius: radii.lg,
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
    borderRadius: radii.md,
    backgroundColor: colors.border,
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
    borderRadius: radii.md,
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
});

export default AiChatScreen;
