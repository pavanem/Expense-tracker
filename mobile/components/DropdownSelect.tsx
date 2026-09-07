import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Modal, ScrollView,
} from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownSelectProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
}

export default function DropdownSelect({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Select option...',
  allowClear = true,
}: DropdownSelectProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find((o) => String(o.value) === String(value));
  const displayText = selectedOption ? selectedOption.label : (value ? value : placeholder);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, !selectedOption && !value && styles.placeholderText]}>
          {displayText}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color="#94a3b8" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalBox}>
            <View style={styles.header}>
              <Text style={styles.title}>{label}</Text>
              <IconButton icon="close" size={20} iconColor="#64748b" onPress={() => setModalVisible(false)} />
            </View>

            <ScrollView style={styles.optionsList} keyboardShouldPersistTaps="handled">
              {allowClear && (
                <TouchableOpacity
                  style={[styles.optionRow, !value && styles.selectedRow]}
                  onPress={() => {
                    onSelect('');
                    setModalVisible(false);
                  }}
                >
                  <Text style={[styles.optionText, !value && styles.selectedText]}>
                    None (Optional)
                  </Text>
                  {!value && <MaterialCommunityIcons name="check" size={20} color="#6366f1" />}
                </TouchableOpacity>
              )}

              {options.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.optionRow, isSelected && styles.selectedRow]}
                    onPress={() => {
                      onSelect(opt.value);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={[styles.optionText, isSelected && styles.selectedText]}>
                      {opt.label}
                    </Text>
                    {isSelected && <MaterialCommunityIcons name="check" size={20} color="#6366f1" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 4,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 4,
    paddingHorizontal: 12,
    height: 48,
  },
  triggerText: {
    color: '#f8fafc',
    fontSize: 14,
    flex: 1,
  },
  placeholderText: {
    color: '#64748b',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  optionsList: {
    paddingVertical: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  selectedRow: {
    backgroundColor: '#334155',
  },
  optionText: {
    color: '#cbd5e1',
    fontSize: 15,
  },
  selectedText: {
    color: '#6366f1',
    fontWeight: '600',
  },
});
