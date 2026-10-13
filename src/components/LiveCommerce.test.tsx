import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useCommerce } from './LiveCommerce'

describe('commerce request state', () => {
  it('immediately hides the previous account records when the loader changes', async () => {
    const first = () => Promise.resolve(['first-account'])
    let resolveNext: (rows: string[]) => void = () => {}
    const next = () => new Promise<string[]>((resolve) => { resolveNext = resolve })
    const { result, rerender } = renderHook(({ loader }) => useCommerce(loader), { initialProps: { loader: first } })
    await waitFor(() => expect(result.current.data).toEqual(['first-account']))
    rerender({ loader: next })
    expect(result.current.data).toBeUndefined()
    await act(async () => resolveNext(['second-account']))
    expect(result.current.data).toEqual(['second-account'])
  })
  it('ignores a late response from a previous account', async () => {
    let resolveFirst: (rows: string[]) => void = () => {}
    const first = () => new Promise<string[]>((resolve) => { resolveFirst = resolve })
    const next = () => Promise.resolve(['current-account'])
    const { result, rerender } = renderHook(({ loader }) => useCommerce(loader), { initialProps: { loader: first } })
    rerender({ loader: next })
    await waitFor(() => expect(result.current.data).toEqual(['current-account']))
    await act(async () => resolveFirst(['stale-account']))
    expect(result.current.data).toEqual(['current-account'])
  })
  it('clears a failed request and supports a successful retry', async () => {
    let fail = true
    const loader = async () => { if (fail) throw new Error('Connection unavailable'); return ['recovered'] }
    const { result } = renderHook(() => useCommerce(loader))
    await waitFor(() => expect(result.current.error).toBe('Connection unavailable'))
    fail = false
    act(() => result.current.refresh())
    expect(result.current.error).toBeUndefined()
    await waitFor(() => expect(result.current.data).toEqual(['recovered']))
  })
})
