import { Link } from 'react-router';
import { ArrowUpRight, BookOpen, CreditCard, GraduationCap } from 'lucide-react';
import { PageHeading } from '../components/UI';
export default function Help() {
  return (
    <div className="page help-page">
      <PageHeading
        eyebrow="A LITTLE HELP ALONG THE WAY"
        title="Make yourself at home."
        description="A few useful things to know about learning on Forma."
      />
      <div className="help-intro">
        {[
          {
            icon: BookOpen,
            title: 'Find your starting point',
            text: 'Explore the course library, filter by subject or level, and preview available lessons.',
          },
          {
            icon: CreditCard,
            title: 'Make it yours',
            text: 'Sign in and enroll through the payment options available on your course page.',
          },
          {
            icon: GraduationCap,
            title: 'Keep moving forward',
            text: 'Find your courses in My learning. Watch each lesson and mark it complete when you’re ready.',
          },
        ].map(({ icon: Icon, title, text }, i) => (
          <div className="panel" key={title}>
            <Icon size={27} strokeWidth={1.4} />
            <span className="eyebrow">0{i + 1}</span>
            <h2>{title}</h2>
            <p>{text}</p>
          </div>
        ))}
      </div>
      <section className="faq-section">
        <h2>A few good questions.</h2>
        {[
          [
            'Where are my purchased courses?',
            'Open My learning in the navigation. Courses appear after payment has been verified. If you’ve just paid, allow a moment for confirmation and refresh your course page.',
          ],
          [
            'Why can’t I watch a video?',
            'Video links expire to keep course content private. Use Refresh video to request a new link. If playback still fails, check your connection and try again. Your completed lessons stay saved.',
          ],
          [
            'Where are my saved courses stored?',
            'Your saved collection is stored in this browser, separately for each signed-in account. It does not sync across devices and may disappear if you clear browser storage.',
          ],
          [
            'Can I learn on my phone?',
            'Yes. The course library, account pages, and lesson player adapt to smaller screens. Use the menu button to open navigation.',
          ],
          [
            'Can I teach on Forma?',
            'Instructor accounts are approved by the platform operator. Once your account has instructor access, the Instructor studio appears in your navigation.',
          ],
          [
            'What if I forgot my password?',
            'Self-service password recovery is not available yet. Contact your platform operator using the contact details they provided. If you’re already signed in and know your current password, you can change it in Account settings.',
          ],
          [
            'How do refunds work?',
            'Refund requests are handled by the platform operator. Keep your payment reference and course name handy when contacting them. A refund option is not available inside this app.',
          ],
        ].map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </section>
      <Link className="button" to="/courses">
        Back to your next discovery
        <ArrowUpRight size={17} />
      </Link>
    </div>
  );
}
