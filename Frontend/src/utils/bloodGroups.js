export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export const BLOOD_GROUP_COLORS = {
  'A+': 'red',
  'A-': 'rose',
  'B+': 'blue',
  'B-': 'cyan',
  'O+': 'green',
  'O-': 'emerald',
  'AB+': 'purple',
  'AB-': 'fuchsia',
};

export const COMPATIBILITY = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'],
  'AB+': BLOOD_GROUPS,
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
};
