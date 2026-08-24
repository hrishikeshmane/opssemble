import { describe, expect, it } from "vitest"

import { parseGitHubRepository, RepositoryInputError } from "./repository-ref"

describe("parseGitHubRepository", () => {
  it.each([
    "pingdotgg/t3code",
    "github.com/pingdotgg/t3code",
    "https://github.com/pingdotgg/t3code",
    "https://github.com/pingdotgg/t3code.git",
    "git@github.com:pingdotgg/t3code.git",
  ])("normalizes %s", (input) => {
    expect(parseGitHubRepository(input)).toEqual({
      host: "github.com",
      owner: "pingdotgg",
      repository: "t3code",
      slug: "pingdotgg/t3code",
    })
  })

  it.each([
    "",
    "pingdotgg",
    "https://gitlab.com/pingdotgg/t3code",
    "https://github.com/pingdotgg/t3code/pull/1",
    "../t3code",
  ])("rejects %s", (input) => {
    expect(() => parseGitHubRepository(input)).toThrow(RepositoryInputError)
  })
})
