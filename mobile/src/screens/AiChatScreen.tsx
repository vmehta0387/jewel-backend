import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Image,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const AiChatScreen = () => {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [composerHeight, setComposerHeight] = useState(64);
  const [androidOverlayLift, setAndroidOverlayLift] = useState(0);
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const listRef = useRef<FlatList<ChatMessage> | null>(null);
  const initialWindowHeightRef = useRef(windowHeight);
  const androidResizeSessionRef = useRef(false);
  const composerBottom = useRef(new Animated.Value(tabBarHeight)).current;
  const navigation = useNavigation<NavigationProp<any>>();

  const canSend = input.trim().length > 0 && !loading;
  const canClear = messages.length > 0 && !loading;
  const androidResizeDelta = Platform.OS === 'android' ? Math.max(0, initialWindowHeightRef.current - windowHeight) : 0;
  const androidUsingResize = Platform.OS === 'android' && (androidResizeDelta > 0 || androidResizeSessionRef.current);
  const composerDocked = Platform.OS === 'android' ? androidUsingResize || keyboardVisible : keyboardVisible;
  const composerBottomStyle =
    Platform.OS === 'android'
      ? androidUsingResize
        ? 0
        : keyboardVisible
          ? androidOverlayLift
          : tabBarHeight
      : composerBottom;
  const listBottomPadding = composerHeight + (composerDocked ? spacing.lg : tabBarHeight + spacing.lg);

  const animateComposer = useCallback(
    (toValue: number, duration = 220) => {
      Animated.timing(composerBottom, {
        toValue,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    },
    [composerBottom],
  );

  useEffect(() => {
    if (!keyboardVisible && windowHeight > initialWindowHeightRef.current) {
      initialWindowHeightRef.current = windowHeight;
    }
  }, [keyboardVisible, windowHeight]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    if (androidResizeDelta > 0) {
      androidResizeSessionRef.current = true;
      return;
    }

    if (!keyboardVisible) {
      androidResizeSessionRef.current = false;
    }
  }, [androidResizeDelta, keyboardVisible]);

  useEffect(() => {
    if (Platform.OS !== 'android' && !keyboardVisible) {
      composerBottom.setValue(tabBarHeight);
    }
  }, [composerBottom, keyboardVisible, tabBarHeight]);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      const frameSub = Keyboard.addListener('keyboardWillChangeFrame', (event) => {
        const keyboardHeight = Math.max(
          0,
          windowHeight - (event.endCoordinates?.screenY ?? windowHeight) - insets.bottom,
        );
        const nextVisible = keyboardHeight > 0;
        setKeyboardVisible(nextVisible);
        animateComposer(nextVisible ? keyboardHeight : tabBarHeight, event.duration ?? 250);
      });

      return () => {
        frameSub.remove();
      };
    }

    const showSub = Keyboard.addListener('keyboardDidShow', (event) => {
      const overlayFromHeight = Math.max(0, event.endCoordinates?.height ?? 0);
      const overlayFromScreenY = Math.max(
        0,
        initialWindowHeightRef.current - (event.endCoordinates?.screenY ?? initialWindowHeightRef.current),
      );
      const keyboardHeight = Math.max(overlayFromHeight, overlayFromScreenY);
      const resizedWindowHeight = Math.max(0, initialWindowHeightRef.current - windowHeight);
      const composerLift = Math.max(0, keyboardHeight - resizedWindowHeight);

      setKeyboardVisible(true);
      setAndroidOverlayLift(resizedWindowHeight > 0 ? 0 : composerLift);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      setAndroidOverlayLift(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [androidUsingResize, insets.bottom, windowHeight]);

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

  const renderContent = () => (
    <>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
        ListEmptyComponent={listEmpty}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        automaticallyAdjustKeyboardInsets={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      <Animated.View
        style={[styles.inputBarShell, { bottom: composerBottomStyle }]}
        onLayout={(event) => setComposerHeight(Math.ceil(event.nativeEvent.layout.height))}
      >
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
      </Animated.View>
    </>
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
            <Ionicons name="trash-outline" size={16} color={canClear ? colors.text : colors.textMuted} />
            <Text style={[styles.clearText, !canClear ? styles.clearTextDisabled : null]}>Clear</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.container}>{renderContent()}</View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    paddingHorizontal: spacing.lg,
  },
  listContent: {
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
  designList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  designItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  designTitle: {
    fontWeight: '600',
    color: colors.text,
  },
  designMeta: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 12,
  },
  inputBarShell: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 10,
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
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  clearDisabled: {
    opacity: 0.5,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  clearTextDisabled: {
    color: colors.textMuted,
  },
});

const ChatBubble = React.memo(
  ({
    item,
    onPressDesign,
  }: {
    item: ChatMessage;
    onPressDesign: (designId: string) => void;
  }) => (
    <View style={[styles.messageRow, item.role === 'user' ? styles.messageRowRight : null]}>
      <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.messageText, item.role === 'user' ? styles.userText : styles.assistantText]}>
          {item.text}
        </Text>
        {item.images && item.images.length ? (
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
  ),
);
ChatBubble.displayName = 'ChatBubble';

export default AiChatScreen;
