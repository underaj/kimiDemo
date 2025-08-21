"use client";

import { useState } from "react";
import { OPENAI_MODEL_ID } from "@/constants";

interface ModelDropdownProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function ModelDropdown({
  value,
  onChange,
  placeholder = "Choose Model",
  className = "",
}: ModelDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const options = Object.keys(OPENAI_MODEL_ID);

  const handleSelect = (option: string) => {
    onChange?.(option);
    setIsOpen(false);
  };

  const selectedOption = value || "";

  return (
    <div className={`relative ${className}`}>
      <label
        htmlFor="search"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        OpenAI Model
      </label>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full bg-white border border-gray-300 rounded-md pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      >
        <span className="block truncate">{selectedOption || placeholder}</span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className={`h-5 w-5 text-gray-400 transform transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      {/* Dropdown Options */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Options List */}
          <div className="absolute z-20 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                className={`w-full text-left px-4 py-2 hover:bg-indigo-50 hover:text-indigo-600 transition-colors duration-150 ${
                  selectedOption === option
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-900"
                }`}
              >
                <span className="block truncate">{option}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
