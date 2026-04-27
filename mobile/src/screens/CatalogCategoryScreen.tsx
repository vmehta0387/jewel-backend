import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { fetchDesigns } from '../api/designs';
import type { Design } from '../types';
import type { CatalogPresetCategory } from '../navigation/RootNavigator';

type CategoryOption = {
  key: CatalogPresetCategory;
  label: string;
};

const CATEGORY_OPTIONS: CategoryOption[] = [
  { key: 'rings', label: 'Rings' },
  { key: 'bracelets', label: 'Bracelets' },
  { key: 'studs', label: 'Studs' },
  { key: 'necklaces', label: 'Necklaces' },
];

const CATEGORY_IMAGES: Record<CatalogPresetCategory, any> = {
  rings: require('../../assets/rings.png'),
  bracelets: require('../../assets/bracelet.png'),
  studs: require('../../assets/studs.png'),
  necklaces: require('../../assets/necklace.png'),
};

const CATEGORY_HINTS: Record<CatalogPresetCategory, string[]> = {
  rings: ['ring'],
  bracelets: ['bracelet', 'bangle'],
  studs: ['stud', 'earring'],
  necklaces: ['necklace', 'pendant', 'chain'],
};

const normalizeBaseDesignNo = (designNo?: string | null) => String(designNo || '').replace(/-V\d+$/i, '').trim();

type CategoryCountStats = {
  designs: number;
  versions: number;
};

const EMPTY_COUNTS: Record<CatalogPresetCategory, CategoryCountStats> = {
  rings: { designs: 0, versions: 0 },
  bracelets: { designs: 0, versions: 0 },
  studs: { designs: 0, versions: 0 },
  necklaces: { designs: 0, versions: 0 },
};

const CatalogCategoryScreen = () => {
  const navigation = useNavigation<any>();
  const { user, token } = useAuth();
  const [search, setSearch] = useState('');
  const [categoryCounts, setCategoryCounts] = useState<Record<CatalogPresetCategory, CategoryCountStats>>(EMPTY_COUNTS);
  const [countsLoading, setCountsLoading] = useState(true);

  const showDashboardBack = useMemo(
    () => user?.role === 'BRANCH_MANAGER' || user?.role === 'SALES_REP',
    [user?.role],
  );

  const openDesigns = (params?: { presetCategory?: CatalogPresetCategory; prefillSearch?: string }) => {
    navigation.navigate('Designs', params);
  };

  const handleSearchSubmit = () => {
    const query = search.trim();
    if (!query) {
      openDesigns();
      return;
    }
    openDesigns({ prefillSearch: query });
  };

  const openNotifications = useCallback(() => {
    (navigation as any).navigate('OrdersTab');
  }, [navigation]);

  const renderCategoryGlyph = (key: CatalogPresetCategory) => {
    return <Image source={CATEGORY_IMAGES[key]} style={styles.categoryIconImage} resizeMode="contain" />;
  };

  const loadCategoryCounts = useCallback(async () => {
    if (!token) {
      setCategoryCounts(EMPTY_COUNTS);
      setCountsLoading(false);
      return;
    }

    setCountsLoading(true);
    try {
      const limit = 200;
      let page = 1;
      let totalPages = 1;
      const rows: Design[] = [];

      do {
        const response = await fetchDesigns(token, page, limit);
        rows.push(...(response.data || []));
        totalPages = response.totalPages || 1;
        page += 1;
      } while (page <= totalPages);

      const uniqueByCategory: Record<CatalogPresetCategory, Set<string>> = {
        rings: new Set<string>(),
        bracelets: new Set<string>(),
        studs: new Set<string>(),
        necklaces: new Set<string>(),
      };
      const versionCounts: Record<CatalogPresetCategory, number> = {
        rings: 0,
        bracelets: 0,
        studs: 0,
        necklaces: 0,
      };

      rows.forEach((design) => {
        const searchableText = [
          design.jewelryGroup,
          design.collection,
          design.designName,
          design.designNo,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const uniqueKey = normalizeBaseDesignNo(design.designNo) || design.id;

        (Object.keys(CATEGORY_HINTS) as CatalogPresetCategory[]).forEach((categoryKey) => {
          if (CATEGORY_HINTS[categoryKey].some((hint) => searchableText.includes(hint))) {
            uniqueByCategory[categoryKey].add(uniqueKey);
            versionCounts[categoryKey] += 1;
          }
        });
      });

      setCategoryCounts({
        rings: { designs: uniqueByCategory.rings.size, versions: versionCounts.rings },
        bracelets: { designs: uniqueByCategory.bracelets.size, versions: versionCounts.bracelets },
        studs: { designs: uniqueByCategory.studs.size, versions: versionCounts.studs },
        necklaces: { designs: uniqueByCategory.necklaces.size, versions: versionCounts.necklaces },
      });
    } catch {
      setCategoryCounts(EMPTY_COUNTS);
    } finally {
      setCountsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadCategoryCounts();
    }, [loadCategoryCounts]),
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            activeOpacity={0.85}
            onPress={() => {
              if (showDashboardBack) {
                navigation.navigate('DashboardTab');
                return;
              }
              if (navigation.canGoBack()) navigation.goBack();
            }}
          >
            <Ionicons name="chevron-back" size={18} color="#6A635C" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Browse Catalog</Text>

          <TouchableOpacity style={styles.headerBellBtn} activeOpacity={0.85} onPress={openNotifications}>
            <Ionicons name="notifications-outline" size={18} color="#6A635C" />
            <View style={styles.headerBellBadge}>
              <Text style={styles.headerBellBadgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color="#A29789" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search products..."
            placeholderTextColor="#A29789"
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
          />
          <TouchableOpacity style={styles.searchActionBtn} onPress={() => openDesigns()} activeOpacity={0.85}>
            <Ionicons name="grid-outline" size={15} color="#8D8276" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchActionBtn} onPress={handleSearchSubmit} activeOpacity={0.85}>
            <Ionicons name="arrow-forward" size={15} color="#8D8276" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionEyebrow}>SELECT A CATEGORY</Text>
        <Text style={styles.sectionTitle}>What are you selling?</Text>

        <View style={styles.grid}>
          {CATEGORY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={styles.gridItem}
              activeOpacity={0.9}
              onPress={() => openDesigns({ presetCategory: option.key })}
            >
              <View style={styles.categoryCircle}>{renderCategoryGlyph(option.key)}</View>
              <Text style={styles.categoryLabel}>{option.label}</Text>
              <Text style={styles.categoryMeta}>
                {countsLoading
                  ? 'Loading...'
                  : `${categoryCounts[option.key].designs} ${
                      categoryCounts[option.key].designs === 1 ? 'design' : 'designs'
                    } - ${categoryCounts[option.key].versions} ${
                      categoryCounts[option.key].versions === 1 ? 'version' : 'versions'
                    }`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 10 : 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    color: '#3B352F',
    fontWeight: '600',
  },
  headerBellBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2D8CC',
    backgroundColor: '#FBF9F6',
  },
  headerBellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#DE5858',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    paddingHorizontal: 3,
  },
  headerBellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  searchWrap: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCCFC0',
    backgroundColor: '#FBF9F6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#3A352E',
    marginLeft: 8,
    height: 40,
  },
  searchActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DED4C8',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    backgroundColor: '#FFFFFF',
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A18C6A',
    letterSpacing: 2,
    textAlign: 'center',
  },
  sectionTitle: {
    marginTop: 6,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    color: '#1E1B18',
    textAlign: 'center',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryCircle: {
    width: 144,
    height: 144,
    borderRadius: 72,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 10,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2B2621',
  },
  categoryMeta: {
    marginTop: 2,
    fontSize: 11,
    color: '#9D958C',
    textAlign: 'center',
  },
  categoryIconImage: {
    width: 96,
    height: 96,
  },
});

export default CatalogCategoryScreen;

