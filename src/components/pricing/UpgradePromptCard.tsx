import { Sparkles, ArrowRight } from 'lucide-react';

interface UpgradePromptCardProps {
  currentPlan: 'free' | 'starter' | 'growth';
  onUpgrade: () => void;
}

export function UpgradePromptCard({ currentPlan, onUpgrade }: UpgradePromptCardProps) {
  const prompts = {
    free: {
      title: 'Ready to grow your art business?',
      description: 'Upgrade to Starter for 4 active displays, 10 artwork listings, lower platform fees (10%), and up to 3 venue applications per month.',
      cta: 'Upgrade to Starter – $9/mo',
      features: ['4 active displays', '10 artworks', 'Lower fees (10%)'],
    },
    starter: {
      title: 'Unlock unlimited applications',
      description: 'Upgrade to Growth for 10 active displays, unlimited venue applications, priority visibility, and lower platform fees (8%).',
      cta: 'Upgrade to Growth – $19/mo',
      features: ['10 active displays', 'Unlimited applications', 'Lower fees (8%)'],
    },
    growth: {
      title: 'Get protection included FREE',
      description: 'Upgrade to Pro for unlimited active displays, free Artwork Protection Plan, 6% platform fees, and highest visibility.',
      cta: 'Upgrade to Pro – $39/mo',
      features: ['Unlimited displays', 'FREE protection', 'Lowest fees (6%)'],
    },
  };

  const prompt = prompts[currentPlan];

  return (
    <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-6 text-white">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-white dark:bg-neutral-800/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg mb-2 text-neutral-900 dark:text-neutral-50">{prompt.title}</h3>
          <p className="text-sm text-white/90 mb-4">{prompt.description}</p>
          <ul className="space-y-1 mb-4">
            {prompt.features.map((feature, index) => (
              <li key={index} className="text-sm text-white/90 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-white dark:bg-neutral-800 rounded-full"></span>
                {feature}
              </li>
            ))}
          </ul>
          <button
            onClick={onUpgrade}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-white dark:bg-neutral-800/90 transition-colors"
          >
            <span>{prompt.cta}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}