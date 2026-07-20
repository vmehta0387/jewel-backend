import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { chatDesigns } from '../api/ai';
import NotificationPopover from '../components/NotificationPopover';
import type { NotificationFeedEntry } from '../utils/appNotifications';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  accentLine?: string;
};

type SuggestionCard = {
  id: string;
  designId?: string;
  title: string;
  meta: string;
  price: number;
};

const INITIAL_THREAD: ChatMessage[] = [];
const DEFAULT_SUGGESTIONS: SuggestionCard[] = [];

const getFirstName = (value?: string | null) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return 'there';
  return trimmed.split(/\s+/)[0];
};

const buildWelcomeMessage = (firstName: string): ChatMessage => ({
  id: 'welcome-assistant',
  role: 'assistant',
  text: `Hi ${firstName}! Ready to help you move some metal.`,
  accentLine: 'What are we selling today?',
});

const formatMoney = (value: number | null | undefined) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numeric);
};

const formatRelativeTime = (date?: string | null) => {
  if (!date) return 'Just now';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Just now';

  const diffMs = Date.now() - parsed.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Yesterday';
  if (diffD < 7) return `${diffD}d ago`;
  return parsed.toLocaleDateString();
};

const AiChatScreen = () => {
  const { token, user } = useAuth();
  const { unreadCount: notificationCount } = useNotifications();
  const navigation = useNavigation<NavigationProp<any>>();
  const chatRef = useRef<ScrollView | null>(null);
  const firstName = useMemo(() => getFirstName(user?.firstName), [user?.firstName]);

  const [thread, setThread] = useState<ChatMessage[]>(() => [buildWelcomeMessage(getFirstName(user?.firstName))]);
  const [suggestions, setSuggestions] = useState<SuggestionCard[]>(DEFAULT_SUGGESTIONS);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [notificationsVisible, setNotificationsVisible] = useState(false);

  const canSend = input.trim().length > 0 && !loading;
  const hasSuggestionResults = suggestions.length > 0;

  useEffect(() => {
    setThread((prev) => {
      if (!prev.length) return [buildWelcomeMessage(firstName)];
      if (prev[0].id !== 'welcome-assistant') return prev;

      const nextText = `Hi ${firstName}! Ready to help you move some metal.`;
      if (prev[0].text === nextText) return prev;

      return [{ ...prev[0], text: nextText }, ...prev.slice(1)];
    });
  }, [firstName]);

  const sendMessage = useCallback(async () => {
    if (!token || loading) return;
    const content = input.trim();
    if (!content) return;

    setThread((prev) => [
      ...prev,
      {
        id: `${Date.now()}-user`,
        role: 'user',
        text: content,
      },
    ]);
    setSuggestions([]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatDesigns(token, {
        message: content,
        companyId: user?.companyId || undefined,
        branchId: user?.branchId || undefined,
        limit: 5,
      });

      const designs = response.designs || [];
      const aiText = response.reply?.trim() || `Found ${designs.length || 0} styles. These are your fastest closers:`;
      setThread((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          text: aiText,
        },
      ]);

      if (designs.length) {
        const nextSuggestions: SuggestionCard[] = designs.slice(0, 2).map((design: any, index: number) => ({
          id: design.id || `sg-${Date.now()}-${index}`,
          designId: design.id,
          title: design.designName || design.designNo || 'Jewelry design',
          meta:
            [design.goldColour, design.diamondQuality, design.collection || design.version]
              .filter(Boolean)
              .join(' - ') || 'Lab EF/VVS - Best seller',
          price: Number(design.displayPrice ?? design.totalValue ?? design.price ?? 0),
        }));
        if (nextSuggestions.length) setSuggestions(nextSuggestions);
      }
    } catch (err: any) {
      setThread((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant-error`,
          role: 'assistant',
          text: err?.message || 'Unable to fetch suggestions right now. Try again in a moment.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, token, user?.companyId, user?.branchId]);

  const latestUserQuery = useMemo(() => {
    const latest = [...thread].reverse().find((item) => item.role === 'user');
    return latest?.text || '';
  }, [thread]);

  const handleOpenNotifications = useCallback(() => {
    setNotificationsVisible(true);
  }, []);

  const handleOpenNotificationEntry = useCallback(
    (_entry: NotificationFeedEntry) => {
      navigation.navigate('OrdersTab');
    },
    [navigation],
  );

  const handleAddAllToQuote = useCallback(() => {
    const first = suggestions[0];
    if (first?.designId) {
      navigation.navigate('DesignsTab', {
        screen: 'DesignDetail',
        params: { designId: first.designId },
      });
      return;
    }
    navigation.navigate('DesignsTab', { screen: 'CatalogCategories' });
  }, [navigation, suggestions]);

  const handleFilterResults = useCallback(() => {
    navigation.navigate('DesignsTab', {
      screen: 'Designs',
      params: { prefillSearch: latestUserQuery || 'rings' },
    });
  }, [navigation, latestUserQuery]);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerLeftWrap}>
            <Image source={require('../../assets/icon.png')} style={[styles.headerBolt, { width: 24, height: 24, resizeMode: 'contain' }]} />
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                BLITZ AI
              </Text>
              <View style={styles.headerSubRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.headerSub} numberOfLines={1}>
                  Your 24/7 sales weapon
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.bellBtn} onPress={handleOpenNotifications} activeOpacity={0.85}>
              <Ionicons name="notifications-outline" size={18} color="#7A6E61" />
              {notificationCount > 0 ? (
                <View style={styles.redBadge}>
                  <Text style={styles.redBadgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
            <View style={styles.callAgentBtn}>
              <Text style={styles.callAgentText}>Call agent</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerDivider} />

        <KeyboardAvoidingView style={styles.keyboardWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={chatRef}
            style={styles.chatScroll}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => chatRef.current?.scrollToEnd({ animated: true })}
          >
            {thread.map((item) => {
              const isAssistant = item.role === 'assistant';
              return (
                <View key={item.id} style={[styles.messageRow, isAssistant ? styles.messageRowLeft : styles.messageRowRight]}>
                  {isAssistant ? (
                    <View style={styles.assistantBoltBadge}>
                      <Image source={require('../../assets/icon.png')} style={{ width: 13, height: 13, resizeMode: 'contain' }} />
                    </View>
                  ) : null}

                  <View style={[styles.messageBubble, isAssistant ? styles.assistantBubble : styles.userBubble]}>
                    <Text style={[styles.messageText, isAssistant ? styles.assistantText : styles.userText]}>{item.text}</Text>
                    {item.accentLine ? (
                      <View style={styles.accentLineRow}>
                        <Ionicons name="diamond" size={10} color="#4D8CD6" />
                        <Text style={styles.accentLineText}>{item.accentLine}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}

            {hasSuggestionResults ? (
              <>
                <View style={styles.suggestionWrap}>
                  {suggestions.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.suggestionCard}
                      activeOpacity={0.9}
                      onPress={() => {
                        if (item.designId) {
                          navigation.navigate('DesignsTab', {
                            screen: 'DesignDetail',
                            params: { designId: item.designId },
                          });
                        }
                      }}
                    >
                      <View style={styles.suggestionLeftIcon}>
                        <View style={styles.suggestionRing} />
                      </View>

                      <View style={styles.suggestionInfo}>
                        <Text style={styles.suggestionTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.suggestionMeta} numberOfLines={1}>
                          {item.meta}
                        </Text>
                      </View>

                      <View style={styles.suggestionPriceWrap}>
                        <Text style={styles.suggestionPrice}>{formatMoney(item.price)}</Text>
                        <Text style={styles.suggestionQuote}>+ Quote</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.actionPrimary} onPress={handleAddAllToQuote} activeOpacity={0.88}>
                    <Text style={styles.actionPrimaryText}>Add all to quote -&gt;</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionGhost} onPress={handleFilterResults} activeOpacity={0.88}>
                    <Text style={styles.actionGhostText}>Filter results</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </ScrollView>

          <View style={styles.inputArea}>
            <View style={styles.inputShell}>
              <TextInput
                style={styles.input}
                placeholder="Ask me anything - I never sleep"
                placeholderTextColor="#A59D96"
                value={input}
                onChangeText={setInput}
                multiline
              />
            </View>
            <TouchableOpacity
              style={[styles.sendBtn, !canSend ? styles.sendBtnDisabled : null]}
              onPress={sendMessage}
              activeOpacity={0.88}
              disabled={!canSend}
            >
              <Ionicons name="flash-sharp" size={18} color="#D8AB52" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        <NotificationPopover
          visible={notificationsVisible}
          onClose={() => setNotificationsVisible(false)}
          onOpenNotification={handleOpenNotificationEntry}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  headerLeftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 6,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerBolt: {
    marginRight: 8,
    marginTop: -1,
  },
  headerTitle: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '800',
    color: '#1E1E1E',
    letterSpacing: 2.4,
  },
  headerSubRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#319B5A',
    marginRight: 6,
  },
  headerSub: {
    fontSize: 10,
    color: '#7D746C',
    fontStyle: 'italic',
    fontWeight: '500',
    maxWidth: 150,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    flexShrink: 0,
  },
  bellBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DED4C8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDFBF8',
    marginRight: 6,
  },
  redBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D84141',
  },
  redBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  callAgentBtn: {
    height: 30,
    minWidth: 74,
    paddingHorizontal: 9,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#DCCFC0',
    backgroundColor: '#FBF8F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callAgentText: {
    fontSize: 10,
    color: '#7A6F66',
    fontWeight: '700',
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#E8E1D7',
  },
  keyboardWrap: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chatScroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chatContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
  },
  messageRow: {
    width: '100%',
    flexDirection: 'row',
    marginBottom: 10,
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  assistantBoltBadge: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 10,
    marginRight: 3,
  },
  messageBubble: {
    maxWidth: '88%',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DED6CB',
  },
  userBubble: {
    backgroundColor: '#1E1A17',
    borderRadius: 11,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
  },
  assistantText: {
    color: '#2E2720',
    fontWeight: '500',
  },
  userText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  accentLineRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
  },
  accentLineText: {
    marginLeft: 5,
    fontSize: 13,
    color: '#34302A',
    fontWeight: '500',
  },
  suggestionWrap: {
    marginTop: 2,
  },
  suggestionCard: {
    minHeight: 76,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E7DED2',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionLeftIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F6EFE4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  suggestionRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.2,
    borderColor: '#B58A49',
  },
  suggestionInfo: {
    flex: 1,
    marginRight: 8,
  },
  suggestionTitle: {
    fontSize: 16,
    lineHeight: 19,
    color: '#2A231D',
    fontWeight: '700',
  },
  suggestionMeta: {
    marginTop: 2,
    fontSize: 11,
    color: '#7D746B',
    fontWeight: '500',
  },
  suggestionPriceWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  suggestionPrice: {
    fontSize: 30,
    lineHeight: 32,
    color: '#B2874A',
    fontWeight: '800',
  },
  suggestionQuote: {
    marginTop: 1,
    fontSize: 11,
    color: '#B2874A',
    fontWeight: '700',
  },
  actionsRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionPrimary: {
    flex: 1,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#1E1A17',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  actionPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  actionGhost: {
    flex: 1,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#D8CEC1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionGhostText: {
    color: '#7A6F65',
    fontSize: 13,
    fontWeight: '700',
  },
  inputArea: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  inputShell: {
    flex: 1,
    minHeight: 42,
    maxHeight: 108,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#DCCFC0',
    backgroundColor: '#F7F3EE',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
  },
  input: {
    fontSize: 13,
    lineHeight: 18,
    color: '#2D261F',
    padding: 0,
    margin: 0,
    includeFontPadding: false,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E1A17',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
});

export default AiChatScreen;
