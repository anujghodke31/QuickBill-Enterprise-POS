import React from 'react';
import './Skeleton.css';

export function Skeleton({ className = '', variant = 'rectangular', width, height, ...props }) {
    const style = {
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
    };

    return (
        <div 
            className={`skeleton ${variant} ${className}`} 
            style={style} 
            {...props} 
        />
    );
}

export function ProductCardSkeleton() {
    return (
        <div className="skeleton-product-card">
            <Skeleton variant="rectangular" className="product-image" height={150} />
            <div className="product-info-skeleton">
                <Skeleton variant="text" width="80%" height={20} />
                <Skeleton variant="text" width="40%" height={16} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 15 }}>
                    <Skeleton variant="text" width="30%" height={24} />
                    <Skeleton variant="circular" width={32} height={32} />
                </div>
            </div>
        </div>
    );
}

export function TableRowSkeleton({ rows = 5, cols = 4 }) {
    return Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
            {Array.from({ length: cols }).map((_, j) => (
                <td key={j} style={{ padding: '15px 10px' }}>
                    <Skeleton variant="text" width={`${Math.random() * (90 - 40) + 40}%`} height={20} />
                </td>
            ))}
        </tr>
    ));
}

export function DashboardCardSkeleton() {
    return (
        <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Skeleton variant="text" width="50%" height={16} />
                <Skeleton variant="circular" width={24} height={24} />
            </div>
            <Skeleton variant="text" width="70%" height={32} />
            <Skeleton variant="text" width="40%" height={14} />
        </div>
    );
}
