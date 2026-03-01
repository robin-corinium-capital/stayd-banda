"use client";

import { useState, useEffect, useCallback } from "react";

interface TourStep {
  target: string;
  title: string;
  description: string;
}

const STEPS: TourStep[] = [
  {
    target: "[data-tour='dashboard']",
    title: "Your Dashboard",
    description: "See your properties, turnovers, and flagged items at a glance.",
  },
  {
    target: "[data-tour='properties']",
    title: "Properties",
    description: "Add and manage your holiday let properties here.",
  },
  {
    target: "[data-tour='turnovers']",
    title: "Turnovers",
    description: "Create turnovers to start documenting guest changeovers with photos.",
  },
  {
    target: "[data-tour='help']",
    title: "Need Help?",
    description: "Find step-by-step guides, FAQs, and tips on exporting evidence.",
  },
];

const STORAGE_KEY = "banda-onboarding-complete";

export function OnboardingTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const updatePosition = useCallback(() => {
    if (!isVisible) return;
    const step = STEPS[currentStep];
    const el = document.querySelector(step.target);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const tooltipHeight = 180;
    const tooltipWidth = 320;
    const gap = 12;

    const spaceBelow = window.innerHeight - rect.bottom;
    const showBelow = spaceBelow > tooltipHeight + gap;

    const top = showBelow
      ? rect.bottom + gap + window.scrollY
      : rect.top - tooltipHeight - gap + window.scrollY;

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));

    setPosition({ top, left });
  }, [currentStep, isVisible]);

  useEffect(() => {
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [updatePosition]);

  const complete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
  }, []);

  const next = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      complete();
    }
  }, [currentStep, complete]);

  if (!isVisible) return null;

  const step = STEPS[currentStep];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/15"
        onClick={complete}
      />

      {/* Tooltip */}
      <div
        className="fixed z-50 w-80 rounded-card bg-surface-card p-5 shadow-xl ring-1 ring-surface-border"
        style={{ top: position.top, left: position.left }}
      >
        {/* Step indicator */}
        <div className="mb-3 flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i <= currentStep ? "bg-brand" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        <h3 className="text-sm font-semibold text-gray-900">{step.title}</h3>
        <p className="mt-1 text-sm text-gray-600">{step.description}</p>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={complete}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Skip tour
          </button>
          <button
            onClick={next}
            className="rounded-btn bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-light"
          >
            {currentStep < STEPS.length - 1 ? "Next" : "Done"}
          </button>
        </div>
      </div>
    </>
  );
}
