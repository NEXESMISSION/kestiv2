export default function Head() {
  const canonical = 'https://kestipro.com/landing'
  const title = 'كاستي برو | حل كامل لنقاط البيع وإدارة المخزون'
  const description =
    'وداعاً للدفاتر والحسابات اليدوية. كاستي برو: نظام نقاط البيع والمخزون الذكي، يعمل من هاتفك مع تنبيهات مخزون، تقارير ربح، وتجربة مجانية 15 يوم.'

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </>
  )
}
