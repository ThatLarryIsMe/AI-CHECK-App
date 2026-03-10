"use client";

import { useState } from "react";

const CONTACT_EMAIL = "diarmojoe@gmail.com";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    teamSize: "",
    message: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const subject = encodeURIComponent(
      `Enterprise Inquiry from ${form.company || form.name}`
    );

    const body = encodeURIComponent(
      [
        `Name: ${form.name}`,
        `Company: ${form.company}`,
        `Email: ${form.email}`,
        `Team Size: ${form.teamSize}`,
        "",
        "Message:",
        form.message,
        "",
        "---",
        "Sent from ProofMode Contact Form",
      ].join("\n")
    );

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <section className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold text-white mb-2">Contact Us</h1>
        <p className="text-slate-400 mb-8">
          Interested in ProofMode for your team or enterprise? Fill out the form
          below and we&apos;ll get back to you.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              className="w-full rounded-lg border border-surface-700 bg-surface-900 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-slate-300 mb-1">
              Company
            </label>
            <input
              id="company"
              name="company"
              type="text"
              required
              value={form.company}
              onChange={handleChange}
              className="w-full rounded-lg border border-surface-700 bg-surface-900 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Your company or organization"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
              Work Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-surface-700 bg-surface-900 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="teamSize" className="block text-sm font-medium text-slate-300 mb-1">
              Team Size
            </label>
            <select
              id="teamSize"
              name="teamSize"
              required
              value={form.teamSize}
              onChange={handleChange}
              className="w-full rounded-lg border border-surface-700 bg-surface-900 px-4 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="" disabled>Select team size</option>
              <option value="1-10">1 - 10</option>
              <option value="11-50">11 - 50</option>
              <option value="51-200">51 - 200</option>
              <option value="201-1000">201 - 1,000</option>
              <option value="1000+">1,000+</option>
            </select>
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-slate-300 mb-1">
              How can we help?
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={4}
              value={form.message}
              onChange={handleChange}
              className="w-full rounded-lg border border-surface-700 bg-surface-900 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
              placeholder="Tell us about your use case, volume needs, or any questions..."
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-500 transition"
          >
            Send Inquiry
          </button>

          <p className="text-xs text-slate-500 text-center">
            Clicking &quot;Send Inquiry&quot; will open your email client with a
            pre-filled message to our enterprise team.
          </p>
        </form>
      </div>
    </section>
  );
}
