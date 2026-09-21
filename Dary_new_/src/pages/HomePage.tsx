import Hero from '../components/Hero/Hero';
import FeaturedProperties from '../components/FeaturedProperties/FeaturedProperties';
import CallToAction from '../components/CallToAction/CallToAction';

export default function HomePage() {
  return (
    <main className="homepage">
      <Hero />
      <FeaturedProperties />
      <CallToAction />
    </main>
  );
}
