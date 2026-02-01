'use client';

import { useEffect, useRef, useState } from 'react';

interface AdBannerProps {
    dataAdSlot: string;
    dataAdFormat?: string;
    dataFullWidthResponsive?: boolean;
    className?: string;
}

declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

export default function AdBanner({
    dataAdSlot,
    dataAdFormat = 'auto',
    dataFullWidthResponsive = true,
    className = '',
}: AdBannerProps) {
    const adInited = useRef(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        if (typeof window !== 'undefined' && !adInited.current) {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                adInited.current = true;
            } catch (err) {
                console.error('AdSense Error:', err);
            }
        }
    }, []);

    const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

    if (!clientId || !isMounted) return null;

    return (
        <div className={`overflow-hidden ${className}`}>
            <ins
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client={clientId}
                data-ad-slot={dataAdSlot}
                data-ad-format={dataAdFormat}
                data-full-width-responsive={dataFullWidthResponsive ? 'true' : 'false'}
            />
        </div>
    );
}
