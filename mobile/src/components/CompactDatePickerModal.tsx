import React, { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';

type Props = {
  visible: boolean;
  value: Date | null;
  minimumDate?: Date;
  onClose: () => void;
  onConfirm: (date: Date) => void;
};

const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

const clampDateToMinimum = (date: Date, minimumDate?: Date) => {
  if (!minimumDate) return date;
  if (date.getTime() < minimumDate.getTime()) return minimumDate;
  return date;
};

const CompactDatePickerModal: React.FC<Props> = ({ visible, value, minimumDate, onClose, onConfirm }) => {
  const initial = useMemo(() => {
    const fallback = minimumDate ? new Date(minimumDate) : new Date();
    return value ? new Date(value) : fallback;
  }, [value, minimumDate]);

  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth() + 1);
  const [day, setDay] = useState(initial.getDate());

  useEffect(() => {
    if (!visible) return;
    const next = value ? new Date(value) : minimumDate ? new Date(minimumDate) : new Date();
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
    setDay(next.getDate());
  }, [visible, value, minimumDate]);

  const currentYear = new Date().getFullYear();
  const minYear = minimumDate?.getFullYear() ?? currentYear;
  const minMonth = minimumDate ? minimumDate.getMonth() + 1 : 1;
  const minDay = minimumDate ? minimumDate.getDate() : 1;
  const yearStart = minYear;
  const yearEnd = currentYear + 12;
  const years = Array.from({ length: yearEnd - yearStart + 1 }, (_, i) => yearStart + i);

  const months = Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => {
    if (!minimumDate) return true;
    if (year > minYear) return true;
    return m >= minMonth;
  });

  const monthStart = months.length > 0 ? months[0] : minMonth;

  const daysInMonth = getDaysInMonth(year, month);
  const dayMin = minimumDate && year === minYear && month === minMonth ? minDay : 1;
  const days = Array.from({ length: daysInMonth - dayMin + 1 }, (_, i) => i + dayMin);

  useEffect(() => {
    if (day > daysInMonth) setDay(daysInMonth);
  }, [day, daysInMonth]);

  useEffect(() => {
    if (month < monthStart) {
      setMonth(monthStart);
    }
  }, [month, monthStart]);

  useEffect(() => {
    if (day < dayMin) {
      setDay(dayMin);
    }
  }, [day, dayMin]);

  const handleConfirm = () => {
    const selected = new Date(year, month - 1, day);
    selected.setHours(0, 0, 0, 0);
    onConfirm(clampDateToMinimum(selected, minimumDate));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Select Date</Text>

          <View style={styles.pickerRow}>
            <View style={styles.pickerWrap}>
              <Text style={styles.label}>Day</Text>
              <Picker selectedValue={day} onValueChange={(v) => setDay(Number(v))}>
                {days.map((d) => (
                  <Picker.Item key={`d-${d}`} label={String(d)} value={d} />
                ))}
              </Picker>
            </View>

            <View style={styles.pickerWrap}>
              <Text style={styles.label}>Month</Text>
              <Picker selectedValue={month} onValueChange={(v) => setMonth(Number(v))}>
                {months.map((m) => (
                  <Picker.Item key={`m-${m}`} label={String(m).padStart(2, '0')} value={m} />
                ))}
              </Picker>
            </View>

            <View style={styles.pickerWrap}>
              <Text style={styles.label}>Year</Text>
              <Picker selectedValue={year} onValueChange={(v) => setYear(Number(v))}>
                {years.map((y) => (
                  <Picker.Item key={`y-${y}`} label={String(y)} value={y} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={onClose} activeOpacity={0.9}>
              <Text style={[styles.actionText, styles.cancelText]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.confirmBtn]} onPress={handleConfirm} activeOpacity={0.9}>
              <Text style={[styles.actionText, styles.confirmText]}>Set Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    borderRadius: 14,
    backgroundColor: '#fff',
    padding: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C1E16',
    marginBottom: 10,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerWrap: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#78695a',
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f7efea',
    borderWidth: 1,
    borderColor: '#dac8bb',
  },
  confirmBtn: {
    backgroundColor: '#8a6b55',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cancelText: {
    color: '#6e5b4c',
  },
  confirmText: {
    color: '#fff',
  },
});

export default CompactDatePickerModal;
