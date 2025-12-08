import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Kesti Pro - كاستي برو | نظام الكاشير الذكي'
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
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #3b82f6 100%)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {/* Background Elements */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 30% 70%, rgba(59,130,246,0.3) 0%, transparent 50%)',
          }}
        />
        
        {/* Main Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '60px',
          }}
        >
          {/* Logo */}
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '30px',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '35px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}
          >
            <span style={{ fontSize: '64px', fontWeight: 'bold', color: '#1e40af' }}>K</span>
          </div>
          
          {/* Title */}
          <div
            style={{
              fontSize: '64px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '20px',
              display: 'flex',
              gap: '20px',
            }}
          >
            <span>كاستي برو</span>
            <span style={{ opacity: 0.6 }}>|</span>
            <span>Kesti Pro</span>
          </div>
          
          {/* Description */}
          <div
            style={{
              fontSize: '30px',
              color: 'rgba(255,255,255,0.9)',
              marginBottom: '40px',
              textAlign: 'center',
            }}
          >
            ودّع الدفاتر والحسابات اليدوية
          </div>
          
          {/* Features */}
          <div
            style={{
              display: 'flex',
              gap: '30px',
            }}
          >
            {['POS ذكي', 'مخزون', 'تقارير'].map((item, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  padding: '14px 32px',
                  borderRadius: '40px',
                  fontSize: '24px',
                  color: '#ffffff',
                }}
              >
                ✓ {item}
              </div>
            ))}
          </div>
          
          {/* CTA */}
          <div
            style={{
              marginTop: '45px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              padding: '16px 45px',
              borderRadius: '14px',
              fontSize: '26px',
              fontWeight: 'bold',
              color: '#ffffff',
            }}
          >
            تجربة مجانية 15 يوم!
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
