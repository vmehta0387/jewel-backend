import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  type PanGestureHandlerStateChangeEvent,
  PinchGestureHandler,
  State,
  type PinchGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import Screen from '../components/Screen';
import { useAuth } from '../context/AuthContext';
import { fetchDesign } from '../api/designs';
import { fetchPricePreview } from '../api/orders';
import type { Design } from '../types';
import type { DesignsStackParamList } from '../navigation/RootNavigator';
import { formatNumber } from '../utils/format';

const formatDetailPrice = (value: number | null | undefined) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '$0';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(numeric);
};

const getMetalLabel = (design: Design) => {
  const primaryMetal = design.metals?.[0];
  const carat = primaryMetal?.metalCaratage;
  const tone = design.goldColour || primaryMetal?.goldColour;
  const combined = [carat, tone].filter(Boolean).join(' ');

  return combined || tone || carat || 'Unavailable';
};

const getTotalCaratWeight = (design: Design) => {
  const totalWeight = design.gemstones?.reduce((sum, gem) => sum + Number(gem.wtInCts || 0), 0) || 0;
  return totalWeight > 0 ? `${formatNumber(totalWeight, 2)} ctw` : 'Unavailable';
};

const getSettingLabel = (design: Design) =>
  design.gemstones?.[0]?.stoneType || design.diamondSpread || design.version || 'Unavailable';

const buildDescription = (design: Design) => {
  const stoneShape = design.gemstones?.[0]?.shape?.toLowerCase();
  const jewelryGroup = (design.jewelryGroup || 'design').toLowerCase();
  const metalLabel = getMetalLabel(design);

  const opening = stoneShape
    ? `Elegant ${stoneShape} detailing gives this ${jewelryGroup} a refined showroom presence.`
    : `This ${jewelryGroup} is designed with a refined showroom presence and polished finish.`;

  const closing =
    metalLabel !== 'Unavailable'
      ? `Finished in ${metalLabel}, it balances premium detail with everyday wearability.`
      : 'It balances premium detail with everyday wearability.';

  return `${opening} ${closing}`;
};

const DesignDetailScreen = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<DesignsStackParamList>>();
  const route = useRoute<RouteProp<DesignsStackParamList, 'DesignDetail'>>();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [design, setDesign] = useState<Design | null>(null);
  const [displayPrice, setDisplayPrice] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState(1.15);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [brokenImageUris, setBrokenImageUris] = useState<Record<string, true>>({});
  const [viewerScale, setViewerScale] = useState(1);
  const baseScale = useRef(new Animated.Value(1)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  const baseTranslateX = useRef(new Animated.Value(0)).current;
  const baseTranslateY = useRef(new Animated.Value(0)).current;
  const dragTranslateX = useRef(new Animated.Value(0)).current;
  const dragTranslateY = useRef(new Animated.Value(0)).current;
  const zoomScale = useRef(Animated.multiply(baseScale, pinchScale)).current;
  const translateX = useRef(Animated.add(baseTranslateX, dragTranslateX)).current;
  const translateY = useRef(Animated.add(baseTranslateY, dragTranslateY)).current;
  const lastScale = useRef(1);
  const lastOffset = useRef({ x: 0, y: 0 });
  const pinchHandlerRef = useRef<PinchGestureHandler>(null);
  const panHandlerRef = useRef<PanGestureHandler>(null);

  const loadDesign = useCallback(async () => {
    if (!token) return;

    setError(null);

    try {
      const data = await fetchDesign(token, route.params.designId);
      setDesign(data);
      setSelectedImageIndex(0);
      setBrokenImageUris({});

      const shouldApplyPricing =
        (user?.role === 'BRANCH_MANAGER' || user?.role === 'SALES_REP') &&
        Boolean(user?.companyId) &&
        Boolean(user?.branchId);

      if (shouldApplyPricing) {
        try {
          const preview = await fetchPricePreview(token, data.id, user?.companyId as string, user?.branchId as string);
          setDisplayPrice(preview.finalPrice ?? data.totalValue ?? 0);
        } catch {
          setDisplayPrice(data.totalValue ?? 0);
        }
      } else {
        setDisplayPrice(data.totalValue ?? 0);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load design');
    }
  }, [token, route.params.designId, user?.role, user?.companyId, user?.branchId]);

  useFocusEffect(
    useCallback(() => {
      loadDesign();
    }, [loadDesign]),
  );

  const gallery = useMemo(() => design?.imageUrls?.filter(Boolean) || [], [design?.imageUrls]);
  const activeImage = gallery[selectedImageIndex] || gallery[0];
  const canShowActiveImage = Boolean(activeImage && !brokenImageUris[activeImage]);
  const viewerImageFrame = useMemo(
    () => ({
      width: screenWidth,
      height: screenHeight,
    }),
    [screenHeight, screenWidth],
  );
  const metalLabel = design ? getMetalLabel(design) : 'Unavailable';
  const detailMeta = design ? `Size ${design.jewelrySize || 'N/A'} - ${metalLabel}` : '';
  const specRows = useMemo(
    () =>
      design
        ? [
            { label: 'Diamond Type', value: design.diamondType || 'Unavailable' },
            { label: 'Total Carat Weight', value: getTotalCaratWeight(design) },
            { label: 'Setting', value: getSettingLabel(design) },
            { label: 'Metal', value: metalLabel },
          ]
        : [],
    [design, metalLabel],
  );

  const handleShare = useCallback(async () => {
    if (!design) return;

    await Share.share({
      message: `${design.designNo}\n${detailMeta}\n${formatDetailPrice(displayPrice)}`,
      title: design.designNo,
    });
  }, [design, detailMeta, displayPrice]);

  const handleImageShare = useCallback(async () => {
    if (!design) return;

    const message = [design.designNo, activeImage].filter(Boolean).join('\n');
    await Share.share({
      message,
      title: `${design.designNo} image`,
    });
  }, [activeImage, design]);

  const getPanBounds = useCallback(
    (scale: number) => {
      const x = Math.max(0, (viewerImageFrame.width * scale - viewerImageFrame.width) / 2);
      const y = Math.max(0, (viewerImageFrame.height * scale - viewerImageFrame.height) / 2);
      return { x, y };
    },
    [viewerImageFrame.height, viewerImageFrame.width],
  );

  const clampOffset = useCallback(
    (scale: number, x: number, y: number) => {
      const bounds = getPanBounds(scale);
      return {
        x: Math.max(-bounds.x, Math.min(x, bounds.x)),
        y: Math.max(-bounds.y, Math.min(y, bounds.y)),
      };
    },
    [getPanBounds],
  );

  const resetViewerPosition = useCallback(() => {
    lastOffset.current = { x: 0, y: 0 };
    baseTranslateX.setValue(0);
    baseTranslateY.setValue(0);
    dragTranslateX.setValue(0);
    dragTranslateY.setValue(0);
  }, [baseTranslateX, baseTranslateY, dragTranslateX, dragTranslateY]);

  const resetViewerZoom = useCallback(() => {
    lastScale.current = 1;
    setViewerScale(1);
    baseScale.setValue(1);
    pinchScale.setValue(1);
    resetViewerPosition();
  }, [baseScale, pinchScale, resetViewerPosition]);

  const zoomTo = useCallback(
    (nextScale: number) => {
      const clamped = Math.max(1, Math.min(nextScale, 4));
      const nextOffset = clamped <= 1
        ? { x: 0, y: 0 }
        : clampOffset(clamped, lastOffset.current.x, lastOffset.current.y);

      lastScale.current = clamped;
      setViewerScale(clamped);
      baseScale.setValue(clamped);
      pinchScale.setValue(1);
      lastOffset.current = nextOffset;
      baseTranslateX.setValue(nextOffset.x);
      baseTranslateY.setValue(nextOffset.y);
      dragTranslateX.setValue(0);
      dragTranslateY.setValue(0);
    },
    [baseScale, baseTranslateX, baseTranslateY, clampOffset, dragTranslateX, dragTranslateY, pinchScale],
  );

  const handlePinchGestureEvent = useMemo(
    () =>
      Animated.event([{ nativeEvent: { scale: pinchScale } }], {
        useNativeDriver: true,
      }),
    [pinchScale],
  );

  const handlePanGestureEvent = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { translationX: dragTranslateX, translationY: dragTranslateY } }],
        {
          useNativeDriver: true,
        },
      ),
    [dragTranslateX, dragTranslateY],
  );

  const handlePinchStateChange = useCallback(
    (event: PinchGestureHandlerStateChangeEvent) => {
      if (event.nativeEvent.oldState === State.ACTIVE) {
        zoomTo(lastScale.current * event.nativeEvent.scale);
      }
    },
    [zoomTo],
  );

  const handlePanStateChange = useCallback(
    (event: PanGestureHandlerStateChangeEvent) => {
      if (event.nativeEvent.oldState === State.ACTIVE) {
        const proposedX = lastOffset.current.x + event.nativeEvent.translationX;
        const proposedY = lastOffset.current.y + event.nativeEvent.translationY;
        const nextOffset = viewerScale <= 1
          ? { x: 0, y: 0 }
          : clampOffset(viewerScale, proposedX, proposedY);

        lastOffset.current = nextOffset;
        baseTranslateX.setValue(nextOffset.x);
        baseTranslateY.setValue(nextOffset.y);
        dragTranslateX.setValue(0);
        dragTranslateY.setValue(0);
      }
    },
    [baseTranslateX, baseTranslateY, clampOffset, dragTranslateX, dragTranslateY, viewerScale],
  );

  const markImageBroken = useCallback((uri?: string) => {
    if (!uri) return;

    setBrokenImageUris((current) => {
      if (current[uri]) return current;
      return { ...current, [uri]: true };
    });
  }, []);

  useEffect(() => {
    if (!activeImage || brokenImageUris[activeImage]) {
      setImageAspectRatio(1.15);
      return;
    }

    let cancelled = false;

    Image.getSize(
      activeImage,
      (width, height) => {
        if (!cancelled && width > 0 && height > 0) {
          setImageAspectRatio(width / height);
        }
      },
      () => {
        if (!cancelled) {
          setImageAspectRatio(1.15);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [activeImage, brokenImageUris]);

  useEffect(() => {
    resetViewerZoom();
  }, [resetViewerZoom, selectedImageIndex, viewerVisible]);

  if (!design && !error) {
    return (
      <Screen style={styles.stateScreen}>
        <ActivityIndicator size="large" color="#8a6b55" />
        <Text style={styles.stateText}>Loading design...</Text>
      </Screen>
    );
  }

  if (!design) {
    return (
      <Screen style={styles.stateScreen}>
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Unable to load design</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} activeOpacity={0.9} onPress={loadDesign}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroArea}>
          <View style={styles.heroTopBar}>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()} activeOpacity={0.88}>
              <Ionicons name="arrow-back" size={18} color="#2f2119" />
            </TouchableOpacity>

            <View style={styles.iconGroup}>
              <TouchableOpacity style={styles.iconButton} onPress={handleShare} activeOpacity={0.88}>
                <Ionicons name="arrow-redo-outline" size={18} color="#2f2119" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setSaved((current) => !current)}
                activeOpacity={0.88}
              >
                <Ionicons name={saved ? 'heart' : 'heart-outline'} size={18} color={saved ? '#b55b57' : '#2f2119'} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.94}
            style={[styles.heroImageShell, { aspectRatio: imageAspectRatio }]}
            disabled={!canShowActiveImage}
            onPress={() => setViewerVisible(true)}
          >
            {canShowActiveImage ? (
              <Image
                source={{ uri: activeImage }}
                style={styles.heroImage}
                resizeMode="contain"
                onError={() => markImageBroken(activeImage)}
              />
            ) : (
              <View style={[styles.placeholderHero, styles.placeholderHeroLarge]}>
                <View style={styles.placeholderBadge}>
                  <Ionicons name="diamond-outline" size={28} color="#bc9672" />
                </View>
                <Text style={styles.placeholderTitle}>Design Image Coming Soon</Text>
                <Text style={styles.placeholderText}>This jewelry preview will appear here once the image is available.</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {gallery.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailRow}
            style={styles.thumbnailScroller}
          >
            {gallery.map((imageUrl, index) => (
              <TouchableOpacity
                key={`${imageUrl}-${index}`}
                onPress={() => setSelectedImageIndex(index)}
                activeOpacity={0.88}
                style={[
                  styles.thumbnailFrame,
                  index === selectedImageIndex ? styles.thumbnailFrameActive : null,
                ]}
              >
                {brokenImageUris[imageUrl] ? (
                  <View style={styles.thumbnailPlaceholder}>
                    <Ionicons name="diamond-outline" size={16} color="#b99472" />
                  </View>
                ) : (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                    onError={() => markImageBroken(imageUrl)}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <View
          style={[
            styles.detailCard,
            gallery.length > 1 ? styles.detailCardWithThumbnails : null,
          ]}
        >
          <View style={styles.titleBlock}>
            <Text style={styles.designName}>{design.designNo}</Text>
            <Text style={styles.designPrice}>{formatDetailPrice(displayPrice)}</Text>
            <Text style={styles.designMeta}>{detailMeta}</Text>
          </View>

          <Text style={styles.description}>{buildDescription(design)}</Text>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Specifications</Text>
          </View>

          <View style={styles.specCard}>
            {specRows.map((item, index) => (
              <View key={item.label} style={[styles.specRow, index < specRows.length - 1 ? styles.specRowBorder : null]}>
                <Text style={styles.specLabel}>{item.label}</Text>
                <View style={styles.specValueWrap}>
                  <View style={styles.specDot} />
                  <Text style={styles.specValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.primaryAction}
              activeOpacity={0.92}
              onPress={() => navigation.navigate('FinalizeDesign', { designId: design.id })}
            >
              <Text style={styles.primaryActionText}>Add to Order</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryAction} activeOpacity={0.92} onPress={handleShare}>
              <Ionicons name="arrow-redo-outline" size={16} color="#3f3026" />
              <Text style={styles.secondaryActionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={viewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          resetViewerZoom();
          setViewerVisible(false);
        }}
      >
        <GestureHandlerRootView style={styles.viewerOverlay}>
          <View style={styles.viewerTopBar}>
            <TouchableOpacity
              style={styles.viewerAction}
              activeOpacity={0.88}
              onPress={() => {
                resetViewerZoom();
                setViewerVisible(false);
              }}
            >
              <Ionicons name="close" size={22} color="#b8b8be" />
            </TouchableOpacity>

            <View style={styles.viewerActionsRight}>
              <TouchableOpacity
                style={styles.viewerAction}
                activeOpacity={0.88}
                onPress={() => zoomTo(lastScale.current - 0.5)}
              >
                <Ionicons name="remove" size={20} color="#b8b8be" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.viewerAction}
                activeOpacity={0.88}
                onPress={() => zoomTo(lastScale.current + 0.5)}
              >
                <Ionicons name="add" size={20} color="#b8b8be" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.viewerAction}
                activeOpacity={0.88}
                onPress={handleImageShare}
              >
                <Ionicons name="arrow-redo-outline" size={20} color="#b8b8be" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.viewerStage}>
            <PinchGestureHandler
              ref={pinchHandlerRef}
              simultaneousHandlers={panHandlerRef}
              onGestureEvent={handlePinchGestureEvent}
              onHandlerStateChange={handlePinchStateChange}
            >
              <Animated.View>
                <PanGestureHandler
                  ref={panHandlerRef}
                  simultaneousHandlers={pinchHandlerRef}
                  enabled={viewerScale > 1.01}
                  onGestureEvent={handlePanGestureEvent}
                  onHandlerStateChange={handlePanStateChange}
                >
                  <Animated.View
                    style={[
                      styles.viewerZoomSurface,
                      viewerImageFrame,
                      {
                        transform: [
                          { scale: zoomScale },
                          { translateX },
                          { translateY },
                        ],
                      },
                    ]}
                  >
                    {canShowActiveImage ? (
                      <Image
                        source={{ uri: activeImage }}
                        style={[styles.viewerImage, viewerImageFrame]}
                        resizeMode="contain"
                        onError={() => markImageBroken(activeImage)}
                      />
                    ) : (
                      <View style={[styles.placeholderHero, styles.viewerPlaceholder, viewerImageFrame]}>
                        <View style={styles.placeholderBadge}>
                          <Ionicons name="diamond-outline" size={28} color="#d8b18d" />
                        </View>
                        <Text style={styles.viewerPlaceholderTitle}>Image unavailable</Text>
                        <Text style={[styles.placeholderText, styles.viewerPlaceholderText]}>
                          This design image could not be loaded right now.
                        </Text>
                      </View>
                    )}
                  </Animated.View>
                </PanGestureHandler>
              </Animated.View>
            </PinchGestureHandler>
          </View>

          <View style={styles.viewerFooter}>
            {gallery.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.viewerThumbnailRow}
                style={styles.viewerThumbnailScroller}
              >
                {gallery.map((imageUrl, index) => {
                  const selected = index === selectedImageIndex;
                  const broken = Boolean(brokenImageUris[imageUrl]);

                  return (
                    <TouchableOpacity
                      key={`viewer-${imageUrl}-${index}`}
                      activeOpacity={0.9}
                      onPress={() => setSelectedImageIndex(index)}
                      style={[
                        styles.viewerThumbnailFrame,
                        selected ? styles.viewerThumbnailFrameActive : null,
                      ]}
                    >
                      {broken ? (
                        <View style={[styles.thumbnailPlaceholder, styles.viewerThumbnailPlaceholder]}>
                          <Ionicons name="diamond-outline" size={15} color="#d6b18c" />
                        </View>
                      ) : (
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.thumbnailImage}
                          resizeMode="cover"
                          onError={() => markImageBroken(imageUrl)}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}
          </View>
        </GestureHandlerRootView>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: 'transparent',
  },
  container: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  heroArea: {
    width: '100%',
    position: 'relative',
  },
  heroTopBar: {
    position: 'absolute',
    top: 12,
    left: 18,
    right: 18,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(235,223,209,0.55)',
  },
  heroImageShell: {
    width: '100%',
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  placeholderHero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  placeholderHeroLarge: {
    minHeight: 320,
  },
  placeholderBadge: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: 'rgba(247,233,216,0.95)',
    borderWidth: 1,
    borderColor: '#ead7c3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6f5746',
  },
  placeholderText: {
    fontSize: 13,
    color: '#8a786a',
    textAlign: 'center',
    lineHeight: 19,
  },
  thumbnailRow: {
    paddingTop: 14,
    paddingHorizontal: 18,
    gap: 10,
  },
  thumbnailScroller: {
    marginTop: 2,
  },
  thumbnailFrame: {
    width: 68,
    height: 68,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eadfd2',
    backgroundColor: '#f3e9dd',
  },
  thumbnailFrameActive: {
    borderColor: '#3c2b20',
    borderWidth: 2,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7eee3',
  },
  detailCard: {
    marginTop: -34,
    backgroundColor: '#fffdf9',
    borderRadius: 30,
    padding: 18,
    borderWidth: 1,
    borderColor: '#eee2d5',
    shadowColor: '#3f2717',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 5,
  },
  detailCardWithThumbnails: {
    marginTop: 16,
  },
  titleBlock: {
    marginBottom: 14,
  },
  designName: {
    fontSize: 33,
    lineHeight: 38,
    fontWeight: '500',
    color: '#2a1e17',
    marginBottom: 8,
  },
  designPrice: {
    fontSize: 27,
    fontWeight: '800',
    color: '#1d1510',
    marginBottom: 4,
  },
  designMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b796c',
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64564b',
    marginBottom: 18,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d2119',
  },
  specCard: {
    borderRadius: 18,
    backgroundColor: '#faf6f0',
    borderWidth: 1,
    borderColor: '#eee3d7',
    overflow: 'hidden',
  },
  specRow: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  specRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee3d7',
  },
  specLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#5f5348',
  },
  specValueWrap: {
    maxWidth: '55%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  specDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d6c2ae',
  },
  specValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2f2119',
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  primaryAction: {
    flex: 1.15,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#12171b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 3,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fffdf8',
  },
  secondaryAction: {
    flex: 0.85,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#f8f1e8',
    borderWidth: 1,
    borderColor: '#eadfce',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3f3026',
  },
  stateScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  stateCard: {
    width: '100%',
    maxWidth: 360,
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#fffdf9',
    borderWidth: 1,
    borderColor: '#eee2d5',
    alignItems: 'center',
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#231913',
    marginBottom: 8,
  },
  stateText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#7f7064',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 18,
    height: 46,
    minWidth: 130,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: '#12171b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#fffdf8',
    fontSize: 14,
    fontWeight: '700',
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(12,12,14,0.96)',
  },
  viewerTopBar: {
    position: 'absolute',
    top: 18,
    left: 18,
    right: 18,
    zIndex: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewerAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(142,142,147,0.75)',
  },
  viewerStage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  viewerZoomSurface: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    alignSelf: 'center',
  },
  viewerPlaceholder: {
    alignSelf: 'center',
  },
  viewerPlaceholderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff6ef',
  },
  viewerPlaceholderText: {
    color: 'rgba(255,246,239,0.72)',
  },
  viewerFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    zIndex: 4,
    justifyContent: 'flex-end',
  },
  viewerThumbnailScroller: {
    flexGrow: 0,
  },
  viewerThumbnailRow: {
    paddingHorizontal: 18,
    paddingTop: 0,
    paddingBottom: 0,
    gap: 10,
    alignItems: 'center',
  },
  viewerThumbnailFrame: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(142,142,147,0.55)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  viewerThumbnailFrameActive: {
    borderColor: '#f2d6b8',
    borderWidth: 2,
  },
  viewerThumbnailPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});

export default DesignDetailScreen;
