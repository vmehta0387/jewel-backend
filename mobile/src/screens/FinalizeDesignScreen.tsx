import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Screen from '../components/Screen';
import Card from '../components/Card';
import SectionHeader from '../components/SectionHeader';
import { colors, radii, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import { fetchDesign } from '../api/designs';
import { createOrder } from '../api/orders';
import type { Design } from '../types';
import type { DesignsStackParamList } from '../navigation/RootNavigator';
import { formatCurrency, formatNumber } from '../utils/format';

const uniqueValues = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))));

const FinalizeDesignScreen = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<DesignsStackParamList>>();
  const route = useRoute<RouteProp<DesignsStackParamList, 'FinalizeDesign'>>();

  const [design, setDesign] = useState<Design | null>(null);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedStoneShape, setSelectedStoneShape] = useState('');
  const [selectedStoneSpread, setSelectedStoneSpread] = useState('');
  const [selectedSettingType, setSelectedSettingType] = useState('');
  const [selectedCaratWeight, setSelectedCaratWeight] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('');
  const [selectedMetalKarat, setSelectedMetalKarat] = useState('');
  const [selectedMetalColor, setSelectedMetalColor] = useState('');
  const [selectedRingSize, setSelectedRingSize] = useState('');

  const loadDesign = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const data = await fetchDesign(token, route.params.designId);
      setDesign(data);

      const shapes = uniqueValues(data.gemstones?.map((gem) => gem.shape) || []);
      const qualities = uniqueValues(data.gemstones?.map((gem) => gem.quality) || []);
      const colors = uniqueValues(data.gemstones?.map((gem) => gem.color) || []);
      const settings = uniqueValues(data.gemstones?.map((gem) => gem.stoneType) || []);
      const caratWeight = data.gemstones
        ? formatNumber(
            data.gemstones.reduce((sum, gem) => sum + Number(gem.wtInCts || 0), 0),
            3,
          )
        : '';

      const metalKaratValues = uniqueValues(
        data.metals?.map((metal) => metal.metalCaratage || metal.goldColour || null) || [],
      );

      setSelectedStoneShape(shapes[0] || '');
      setSelectedQuality(qualities[0] || '');
      setSelectedMetalKarat(metalKaratValues[0] || '');
      setSelectedMetalColor(data.goldColour || colors[0] || '');
      setSelectedStoneSpread(data.diamondSpread || '');
      setSelectedSettingType(settings[0] || '');
      setSelectedCaratWeight(caratWeight);
      setSelectedRingSize(data.jewelrySize || '');
    } catch (err: any) {
      setError(err?.message || 'Unable to load design');
    }
  }, [route.params.designId, token]);

  useFocusEffect(
    useCallback(() => {
      loadDesign();
    }, [loadDesign]),
  );

  const derived = useMemo(() => {
    if (!design) return { polishedWt: 0, meleeCt: 0 };
    const polishedWt = design.metals?.reduce((sum, metal) => sum + Number(metal.netWt || 0), 0) || 0;
    const meleeCt = design.gemstones?.reduce((sum, gem) => sum + Number(gem.wtInCts || 0), 0) || 0;
    return { polishedWt, meleeCt };
  }, [design]);

  const handleCreateOrder = async () => {
    if (!token || !design) return;
    if (!user?.companyId || !user?.branchId) {
      setError('Company and branch must be assigned to create an order.');
      return;
    }

    const qty = Number(quantity) || 1;
    setSaving(true);
    setError(null);

    const selection = {
      stoneShape: selectedStoneShape,
      stoneSpread: selectedStoneSpread,
      settingType: selectedSettingType,
      caratWeight: selectedCaratWeight,
      quality: selectedQuality,
      metalKarat: selectedMetalKarat,
      metalColor: selectedMetalColor,
      ringSize: selectedRingSize,
    };

    const shortDescription = `Metal: ${selection.metalKarat || '-'} ${selection.metalColor || ''} | Size: ${selection.ringSize || '-'} | Spread: ${selection.stoneSpread || '-'}`;

    try {
      await createOrder(token, {
        companyId: user.companyId,
        branchId: user.branchId,
        designId: design.id,
        quantity: qty,
        deliveryDate: deliveryDate || undefined,
        shortDescription,
        notes: JSON.stringify({ selection }),
      });
      navigation.goBack();
    } catch (err: any) {
      setError(err?.message || 'Unable to create order');
    } finally {
      setSaving(false);
    }
  };

  if (!design) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.muted}>{error || 'Loading design...'}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <SectionHeader title="Finalize Design" subtitle={design.designNo} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Estimated Shipping</Text>
            <TextInput
              style={styles.summaryInput}
              placeholder="dd-mm-yyyy"
              value={deliveryDate}
              onChangeText={setDeliveryDate}
            />
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Polished Wt</Text>
            <Text style={styles.summaryValue}>{formatNumber(derived.polishedWt, 3)} g</Text>
          </Card>
        </View>
        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Melee CT</Text>
            <Text style={styles.summaryValue}>{formatNumber(derived.meleeCt, 3)} ct</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Price</Text>
            <Text style={styles.summaryValue}>{formatCurrency(design.totalValue || 0)}</Text>
          </Card>
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Selections</Text>

          <Text style={styles.fieldLabel}>Stone Shape</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={selectedStoneShape} onValueChange={setSelectedStoneShape}>
              {selectedStoneShape ? null : <Picker.Item label="Select" value="" />}
              {uniqueValues(design.gemstones?.map((gem) => gem.shape) || []).map((shape) => (
                <Picker.Item key={shape} label={shape} value={shape} />
              ))}
            </Picker>
          </View>

          <Text style={styles.fieldLabel}>Stone Spread</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={selectedStoneSpread} onValueChange={setSelectedStoneSpread}>
              {design.diamondSpread ? (
                <Picker.Item label={design.diamondSpread} value={design.diamondSpread} />
              ) : (
                <Picker.Item label="Select" value="" />
              )}
            </Picker>
          </View>

          <Text style={styles.fieldLabel}>Setting Type</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={selectedSettingType} onValueChange={setSelectedSettingType}>
              {selectedSettingType ? null : <Picker.Item label="Select" value="" />}
              {uniqueValues(design.gemstones?.map((gem) => gem.stoneType) || []).map((setting) => (
                <Picker.Item key={setting} label={setting} value={setting} />
              ))}
            </Picker>
          </View>

          <Text style={styles.fieldLabel}>Carat Weight</Text>
          <TextInput style={styles.input} value={selectedCaratWeight} editable={false} />

          <Text style={styles.fieldLabel}>Diamond Quality</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={selectedQuality} onValueChange={setSelectedQuality}>
              {selectedQuality ? null : <Picker.Item label="Select" value="" />}
              {uniqueValues(design.gemstones?.map((gem) => gem.quality) || []).map((quality) => (
                <Picker.Item key={quality} label={quality} value={quality} />
              ))}
            </Picker>
          </View>

          <Text style={styles.fieldLabel}>Metal Karat</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={selectedMetalKarat} onValueChange={setSelectedMetalKarat}>
              {selectedMetalKarat ? null : <Picker.Item label="Select" value="" />}
              {uniqueValues(
                design.metals?.map((metal) => metal.metalCaratage || metal.goldColour || null) || [],
              ).map((karat) => (
                <Picker.Item key={karat} label={karat} value={karat} />
              ))}
            </Picker>
          </View>

          <Text style={styles.fieldLabel}>Metal Color</Text>
          <TextInput style={styles.input} value={selectedMetalColor} onChangeText={setSelectedMetalColor} />

          <Text style={styles.fieldLabel}>Ring Size</Text>
          <TextInput style={styles.input} value={selectedRingSize} onChangeText={setSelectedRingSize} />

          <Text style={styles.fieldLabel}>Quantity</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
          />
        </Card>

        <TouchableOpacity style={styles.primaryButton} onPress={handleCreateOrder} disabled={saving}>
          <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Create Order'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    color: colors.textMuted,
  },
  error: {
    color: colors.danger,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryCard: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  summaryValue: {
    marginTop: spacing.xs,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  summaryInput: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: colors.text,
  },
  fieldLabel: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textMuted,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginTop: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
    backgroundColor: '#fff',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default FinalizeDesignScreen;
