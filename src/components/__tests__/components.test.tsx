import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { useState } from "react";
import KeycapButton from "../KeycapButton";
import Input from "../Input";
import Select from "../Select";
import Toggle from "../Toggle";
import Modal from "../Modal";
import { ToastProvider, useToast } from "../Toast";
import { HeaderNav, MobileNav } from "../Navigation";

const selectOptions = [
  { value: "myr", label: "MYR" },
  { value: "sgd", label: "SGD" },
  { value: "php", label: "PHP" },
];

describe("KeycapButton", () => {
  it("renders its label and fires onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<KeycapButton onClick={onClick}>SAVE</KeycapButton>);
    await user.click(screen.getByRole("button", { name: "SAVE" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("blocks clicks when disabled and exposes aria-disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <KeycapButton disabled onClick={onClick}>
        SAVE
      </KeycapButton>
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-disabled", "true");
    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Select", () => {
  it("opens on Enter and toggles aria-expanded", async () => {
    const user = userEvent.setup();
    render(<Select options={selectOptions} value="" onChange={() => {}} placeholder="Pick currency" />);
    const trigger = screen.getByRole("combobox");
    trigger.focus();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("navigates with ArrowDown and selects with Enter, calling onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Select options={selectOptions} value="" onChange={onChange} />);
    const trigger = screen.getByRole("combobox");
    trigger.focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledWith("sgd");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Select options={selectOptions} value="" onChange={() => {}} />);
    const trigger = screen.getByRole("combobox");
    trigger.focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(trigger);
  });

  it("closes when clicking outside", async () => {
    const user = userEvent.setup();
    render(<Select options={selectOptions} value="" onChange={() => {}} />);
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true");
    fireEvent.mouseDown(document.body);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
  });
});

describe("Toggle", () => {
  it("renders as a switch and toggles via onChange", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [on, setOn] = useState(false);
      return <Toggle checked={on} onChange={setOn} label="QR payments" />;
    }
    render(<Harness />);
    const sw = screen.getByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "false");
    await user.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "true");
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} disabled />);
    await user.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("Modal", () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Open modal</button>
        <Modal open={open} onClose={() => setOpen(false)} title="Confirm sale">
          <button>Confirm</button>
        </Modal>
      </>
    );
  }

  it("renders title, sets aria-modal, traps focus, and restores it on close", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open modal" });
    await user.click(opener);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Confirm sale")).toBeInTheDocument();
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.activeElement).toBe(opener);
  });

  it("closes on backdrop click", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open modal" }));
    const overlay = screen.getByRole("dialog").parentElement!;
    fireEvent.mouseDown(overlay);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("Toast", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function ToastButton() {
    const { toast } = useToast();
    return (
      <button onClick={() => toast({ message: "Sale saved", variant: "success" })}>Save</button>
    );
  }

  it("shows a message with variant styling and auto-dismisses", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <ToastButton />
      </ToastProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const message = screen.getByText("Sale saved");
    expect(message).toBeInTheDocument();
    expect(message.closest(".toast")).toHaveClass("toast--success");
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.queryByText("Sale saved")).not.toBeInTheDocument();
  });
});

describe("Input", () => {
  it("shows error message with role alert and aria-invalid", () => {
    render(<Input label="Stall name" error="Stall name is required" />);
    const input = screen.getByLabelText("Stall name");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Stall name is required");
    expect(input.getAttribute("aria-describedby")).toBe(alert.id);
  });
});

describe("Navigation", () => {
  it("renders brand and nav links in HeaderNav", () => {
    render(
      <MemoryRouter>
        <HeaderNav stallName="YayaCake" />
      </MemoryRouter>
    );
    expect(screen.getByText("YayaCake POS by Captura")).toBeInTheDocument();
    for (const label of ["Dashboard", "Sell", "Products", "Sales", "Expenses", "Settings"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("opens the More sheet with Settings link from MobileNav", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <MobileNav stallName="YayaCake" />
      </MemoryRouter>
    );
    await user.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });
});
