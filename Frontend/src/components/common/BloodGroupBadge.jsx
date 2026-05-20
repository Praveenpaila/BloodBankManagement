import { BLOOD_GROUP_COLORS } from '../../utils/bloodGroups';

const styles = {
  red: 'bg-red-50 text-red-700 border-red-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
};

const sizes = {
  sm: 'text-xs px-2 py-1',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-2',
};

const BloodGroupBadge = ({ group, size = 'md' }) => {
  const color = BLOOD_GROUP_COLORS[group] || 'red';
  return (
    <span className={`inline-flex rounded-full border font-extrabold ${styles[color]} ${sizes[size]}`}>
      {group || 'N/A'}
    </span>
  );
};

export default BloodGroupBadge;
