import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
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
  const [design, setDesign] = useState<Design | null>(null);
  const [displayPrice, setDisplayPrice] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [saved, setSaved] = useState(false);

  const loadDesign = useCallback(async () => {
    if (!token) return;

    setError(null);

    try {
      const data = await fetchDesign(token, route.params.designId);
      setDesign(data);
      setSelectedImageIndex(0);

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
          <View style={styles.heroImageShell}>
            {activeImage ? (
              <Image source={{ uri: activeImage }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderHero}>
                <Ionicons name="diamond-outline" size={44} color="#c5a890" />
                <Text style={styles.placeholderText}>Image coming soon</Text>
              </View>
            )}
          </View>

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
                <Image source={{ uri: imageUrl }} style={styles.thumbnailImage} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.detailCard}>
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
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f7f0e8',
  },
  container: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  heroArea: {
    position: 'relative',
  },
  heroTopBar: {
    position: 'absolute',
    top: 14,
    left: 18,
    right: 18,
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
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderColor: '#ebdfd1',
  },
  heroImageShell: {
    height: 300,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#f0e5d8',
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
  },
  placeholderText: {
    fontSize: 13,
    color: '#8a786a',
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
    backgroundColor: '#f7f0e8',
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
});

export default DesignDetailScreen;
