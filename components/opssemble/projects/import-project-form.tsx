"use client"

import { useActionState } from "react"
import { FolderDownIcon, LoaderCircleIcon } from "lucide-react"

import {
  importProjectAction,
  type ImportProjectState,
} from "@/app/(app)/projects/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const initialState: ImportProjectState = {
  error: null,
}

export function ImportProjectForm() {
  const [state, formAction, pending] = useActionState(
    importProjectAction,
    initialState
  )

  return (
    <form action={formAction} className="mt-3 max-w-2xl">
      <div className="flex items-center gap-1.5">
        <label htmlFor="repository" className="sr-only">
          GitHub repository
        </label>
        <Input
          id="repository"
          name="repository"
          required
          autoComplete="off"
          spellCheck={false}
          aria-invalid={state.error ? true : undefined}
          placeholder="owner/repository or GitHub URL"
          className="font-mono"
        />
        <Button type="submit" disabled={pending}>
          {pending ? (
            <LoaderCircleIcon
              data-icon="inline-start"
              className="animate-spin"
            />
          ) : (
            <FolderDownIcon data-icon="inline-start" />
          )}
          {pending ? "Cloning" : "Import"}
        </Button>
      </div>
      <p aria-live="polite" className="mt-1 min-h-4 text-xs text-destructive">
        {state.error}
      </p>
    </form>
  )
}
