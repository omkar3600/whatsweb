export default function UserAvatar({ gender, heritage, ageGroup, index, className = '' }: any) {
  // A simple deterministic color/initial based avatar
  const colors = ['bg-emerald-100 text-emerald-700', 'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700'];
  const color = colors[(index || 0) % colors.length];
  
  return (
    <div className={`rounded-full flex items-center justify-center font-bold text-sm ${color} ${className}`}>
      {gender === 'female' ? 'F' : 'M'}
    </div>
  );
}
