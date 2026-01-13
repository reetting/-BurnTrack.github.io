export interface TeamMember {
  name: string;
  role: string;
  school: string;
  imageUrl: string;
}

export interface RoadmapStep {
  title: string;
  description: string;
  icon: 'settings' | 'flame' | 'cpu' | 'rocket';
}

export interface StatItem {
  value: string;
  label: string;
  description: string;
}