import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import "./selector.css";

/**
 * Reusable Selector (Dropdown) Component System.
 * Supports data-driven options, truncation, icons, keyboard navigation,
 * outside-click closing, disabled states, and theme tokens.
 */
export function Selector({
  value,
  options = [],
  onChange,
  placeholder = "Select...",
  disabled = false,
  className = "",
  id,
  "aria-label": ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef(null);
  const menuRef = useRef(null);

  const selectedOption = options.find((option) => option.value === value);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else if (focusedIndex >= 0 && focusedIndex < options.length) {
        const option = options[focusedIndex];
        if (!option.disabled) {
          onChange(option.value);
          setOpen(false);
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setFocusedIndex(0);
      } else {
        setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (open) {
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    }
  };

  return (
    <div className={`selector ${className}`} ref={containerRef}>
      <button
        id={id}
        type="button"
        className={`selector-trigger ${open ? "is-open" : ""}`}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel || placeholder}
      >
        <span className="selector-value-wrapper">
          {selectedOption?.icon && (
            <span className="selector-icon">{selectedOption.icon}</span>
          )}
          <span
            className={`selector-value ${
              !selectedOption ? "is-placeholder" : ""
            }`}
          >
            {selectedOption?.label ?? placeholder}
          </span>
        </span>

        <ChevronDown
          className={`selector-chevron ${open ? "is-rotated" : ""}`}
          size={16}
        />
      </button>

      {open && (
        <div className="selector-menu" ref={menuRef} role="listbox">
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isOptionDisabled = option.disabled || false;

            return (
              <button
                type="button"
                key={option.value}
                role="option"
                aria-selected={isSelected}
                disabled={isOptionDisabled}
                className={`selector-option ${
                  isSelected ? "is-selected" : ""
                } ${isOptionDisabled ? "is-disabled" : ""}`}
                style={
                  focusedIndex === index
                    ? { backgroundColor: "var(--bg-raised)" }
                    : undefined
                }
                onClick={() => {
                  if (!isOptionDisabled) {
                    onChange(option.value);
                    setOpen(false);
                  }
                }}
              >
                <span className="selector-option-label-group">
                  {option.icon && (
                    <span className="selector-icon">{option.icon}</span>
                  )}
                  <span>{option.label}</span>
                </span>

                {isSelected && (
                  <Check className="selector-option-check" size={15} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
