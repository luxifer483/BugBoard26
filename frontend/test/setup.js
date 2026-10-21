// Aggiunge le verifiche sul DOM e pulisce i componenti dopo ogni test.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)
