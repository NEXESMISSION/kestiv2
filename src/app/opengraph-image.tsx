import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Kesti Pro - كاستي برو | نظام إدارة المبيعات الذكي'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {/* Background Pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 40%)',
          }}
        />
        
        {/* Content Container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px',
            textAlign: 'center',
          }}
        >
          {/* Logo Circle */}
          <div
            style={{
              width: '140px',
              height: '140px',
              borderRadius: '35px',
              background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '40px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            }}
          >
            <span style={{ fontSize: '72px', fontWeight: 'bold', color: '#1e40af' }}>K</span>
          </div>
          
          {/* Brand Name */}
          <div
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '16px',
              textShadow: '0 4px 12px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            <span>Kesti Pro</span>
            <span style={{ opacity: 0.8 }}>|</span>
            <span>كاستي برو</span>
          </div>
          
          {/* Tagline */}
          <div
            style={{
              fontSize: '32px',
              color: 'rgba(255,255,255,0.95)',
              marginBottom: '50px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span>نظام إدارة المبيعات والمخزون الذكي</span>
          </div>
          
          {/* Features Row */}
          <div
            style={{
              display: 'flex',
              gap: '40px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {[
              '✓ نقطة بيع ذكية',
              '✓ إدارة المخزون',
              '✓ تقارير مفصلة',
              '✓ يعمل على الهاتف',
            ].map((feature, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  padding: '12px 28px',
                  borderRadius: '50px',
                  fontSize: '22px',
                  color: '#ffffff',
                  backdropFilter: 'blur(10px)',
                }}
              >
                {feature}
              </div>
            ))}
          </div>
          
          {/* CTA */}
          <div
            style={{
              marginTop: '50px',
              background: '#ffffff',
              padding: '18px 50px',
              borderRadius: '16px',
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#1e40af',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}
          >
            ابدأ تجربتك المجانية - 15 يوم
          </div>
        </div>
        
        {/* URL Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            fontSize: '24px',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          kestipro.com
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
