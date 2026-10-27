import React from 'react';

const SNOO_PATH = 'M16.67 10a1.46 1.46 0 00-2.47-1.05 7.12 7.12 0 00-3.85-1.23l.8-2.54 2.18.52a1 1 0 101.07-1.42 1 1 0 00-.97.74l-2.44-.58a.28.28 0 00-.34.19l-.92 2.92a7.17 7.17 0 00-3.87 1.23 1.46 1.46 0 00-1.46 2.47 3.32 3.32 0 000 3.73 1.46 1.46 0 001.46 2.47 7.42 7.42 0 004.18 1.34 7.42 7.42 0 004.18-1.34 1.46 1.46 0 001.46-2.47 3.32 3.32 0 000-3.73 1.46 1.46 0 00-.18-.28zM7.05 11.23a1.05 1.05 0 111.05-1.05 1.05 1.05 0 01-1.05 1.05zm5.9 3.55a3.67 3.67 0 01-2.95 1.03 3.67 3.67 0 01-2.95-1.03.28.28 0 010-.4.28.28 0 01.4 0 3.12 3.12 0 002.55.88 3.12 3.12 0 002.55-.88.28.28 0 01.4 0 .28.28 0 010 .4zm-.1-2.5a1.05 1.05 0 111.05-1.05 1.05 1.05 0 01-1.05 1.05z';

export function UserAvatar({ user, size = 24, className = '' }) {
    const color = user?.avatarColor || '#828F9A';
    return (
        <svg
            className={`snoo-avatar no-invert ${className}`}
            width={size}
            height={size}
            viewBox="0 0 20 20"
            aria-hidden="true"
        >
            <circle cx="10" cy="10" r="10" fill={color} />
            <path fill="#FFF" d={SNOO_PATH} />
        </svg>
    );
}

export function CommunityIcon({ community, size = 24, className = '' }) {
    const label = community?.icon || (community?.name || 'r').charAt(0).toUpperCase();
    const fontSize = Math.max(10, Math.round(size * 0.5));
    const bgColor = community?.color || '#FF4500';
    return (
        <span
            className={`community-icon rc-community-icon no-invert ${className}`}
            style={{
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: bgColor,
                color: '#fff',
                fontSize: `${fontSize}px`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                fontWeight: 'bold',
                flexShrink: 0
            }}
        >
            {label}
        </span>
    );
}
