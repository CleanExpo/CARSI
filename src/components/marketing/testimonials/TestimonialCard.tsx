import { Quote } from 'lucide-react';

export interface Testimonial {
  name: string;
  company: string;
  quote: string;
  featured?: boolean;
}

function StarRow() {
  return (
    <div className="flex gap-0.5" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className="h-3.5 w-3.5 text-[#a85500]" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const featured = testimonial.featured;

  return (
    <figure
      className={`relative flex h-full flex-col rounded-2xl border bg-white p-6 shadow-sm ${
        featured ? 'border-[#146fc2] p-7 sm:p-8' : 'border-slate-200/80'
      }`}
    >
      <Quote className={`mb-3 h-5 w-5 ${featured ? 'text-[#146fc2]' : 'text-slate-300'}`} aria-hidden />
      <StarRow />
      <blockquote className={`mt-4 flex-1 leading-relaxed text-slate-600 ${featured ? 'text-lg' : 'text-sm'}`}>
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-5 border-t border-slate-200/80 pt-4">
        <p className="text-sm font-semibold text-slate-950">{testimonial.name}</p>
        <p className="mt-0.5 text-xs text-slate-500">{testimonial.company}</p>
      </figcaption>
    </figure>
  );
}
