import { createLucideIcon } from 'lucide-react';

const CustomKpiIcon = createLucideIcon('CustomKpiIcon', [

    ['circle', { cx: '12', cy: '12', r: '10', key: 'circle' }],

    ['path', { d: 'M5.2 9v6', key: 'k-stem' }],
    ['path', { d: 'M5.3 12l3 -3', key: 'k-upper' }],
    ['path', { d: 'M5.3 12l3 3', key: 'k-lower' }],

    ['path', { d: 'M11 9v6', key: 'p-stem' }],
    ['path', { d: 'M11 9h3a1.5 1.5 0 0 1 0 3h-3', key: 'p-bowl' }],

    ['path', { d: 'M18.5 9v6', key: 'i-stem' }],
]);

export default CustomKpiIcon;