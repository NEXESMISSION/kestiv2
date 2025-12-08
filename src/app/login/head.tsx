export default function Head() {
  const canonical = 'https://kestipro.com/login'
  const title = 'تسجيل الدخول | كاستي برو'
  const description =
    'سجل دخولك لإدارة المبيعات والمخزون في كاستي برو. إذا كنت جديداً، جرّب التسجيل المجاني لمدة 15 يوماً.'

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="noindex, nofollow" />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </>
  )
}
