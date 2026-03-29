import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import TrendingPapers from '../components/TrendingPapers'
import HowItWorks from '../components/HowItWorks'
import FAQ from '../components/FAQ'
import Footer from '../components/Footer'

export default function Landing() {
  return (
    <div>
      <Navbar />
      <Hero />
      <TrendingPapers />
      <HowItWorks />
      <FAQ />
      <Footer />
    </div>
  )
}