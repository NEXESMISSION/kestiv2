export default function Head() {
  const canonical = 'https://kestipro.com/register'
  const title = 'إنشاء حساب جديد | كاستي برو'
  const description =
    'أنشئ حسابك في كاستي برو وابدأ تجربة مجانية لمدة 15 يوماً لإدارة المبيعات والمخزون بذكاء.'

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
