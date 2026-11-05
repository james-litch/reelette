"use client"

import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@/components/ui/field"

export function CheckboxFilter({
  id,
  label,
  noun,
  options,
  selected,
  onChange,
}: {
  id: string
  label: string
  noun: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (values: string[]) => void
}) {
  const all = `All ${noun}`
  const summary =
    selected.length === 1
      ? options.find(({ value }) => value === selected[0])!.label
      : selected.length > 1
        ? `${selected.length} ${noun}`
        : all

  return (
    <Field className="min-w-0">
      <FieldLabel htmlFor={id} className="sr-only">
        {label}
      </FieldLabel>
      <DropdownMenu>
        <DropdownMenuTrigger
          id={id}
          render={
            <Button
              variant="outline"
              className="w-full min-w-0 justify-between"
            />
          }
        >
          <span className="truncate">{summary}</span>
          <ChevronDown data-icon="inline-end" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuCheckboxItem
              checked={!selected.length}
              closeOnClick={false}
              onCheckedChange={() => onChange([])}
            >
              {all}
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup aria-label={label}>
            {options.map(({ value, label }) => (
              <DropdownMenuCheckboxItem
                key={value}
                checked={selected.includes(value)}
                closeOnClick={false}
                onCheckedChange={(checked) =>
                  onChange(
                    checked
                      ? [...selected, value]
                      : selected.filter((item) => item !== value)
                  )
                }
              >
                <span className="truncate">{label}</span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Field>
  )
}
