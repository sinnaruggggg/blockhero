import React from 'react';
import {
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export function StudioSectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
    </View>
  );
}

export function StudioTextField({
  label,
  value,
  onChangeText,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, multiline && styles.textArea]}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor="#8b735b"
      />
    </View>
  );
}

export function StudioNumberField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        keyboardType="decimal-pad"
        placeholderTextColor="#8b735b"
      />
    </View>
  );
}

export function StudioSwitchField({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{false: '#d9c3a5', true: '#c59353'}}
        thumbColor={value ? '#6a421e' : '#897763'}
      />
    </View>
  );
}

export function StudioChipRow<T extends string>({
  options,
  selectedValue,
  onSelect,
}: {
  options: Array<{value: T; label: string}>;
  selectedValue: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map(option => {
        const active = option.value === selectedValue;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(option.value)}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function StudioActionButton({
  label,
  onPress,
  tone = 'primary',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        tone === 'secondary' && styles.actionButtonSecondary,
        tone === 'danger' && styles.actionButtonDanger,
        disabled && styles.actionButtonDisabled,
      ]}
      disabled={disabled}
      onPress={onPress}>
      <Text
        style={[
          styles.actionButtonText,
          tone !== 'primary' && styles.actionButtonTextSecondary,
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    marginBottom: 10,
    gap: 4,
  },
  sectionTitle: {
    color: '#4f3118',
    fontSize: 20,
    fontWeight: '900',
  },
  sectionDescription: {
    color: '#7b5b39',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    color: '#6d4b28',
    fontSize: 13,
    fontWeight: '900',
  },
  input: {
    backgroundColor: '#fff8ee',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#bc9564',
    color: '#4f3118',
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#f6ead4',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#bc9564',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: '#7f5a32',
    borderColor: '#4f3118',
  },
  chipText: {
    color: '#6f4e2a',
    fontSize: 12,
    fontWeight: '900',
  },
  chipTextActive: {
    color: '#fff6eb',
  },
  actionButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4f3118',
    backgroundColor: '#7f5a32',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  actionButtonSecondary: {
    backgroundColor: '#f6ead4',
    borderColor: '#bc9564',
  },
  actionButtonDanger: {
    backgroundColor: '#f3ddd4',
    borderColor: '#b86b58',
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  actionButtonText: {
    color: '#fff7ef',
    fontSize: 14,
    fontWeight: '900',
  },
  actionButtonTextSecondary: {
    color: '#6d4825',
  },
});
