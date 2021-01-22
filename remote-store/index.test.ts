import { delay } from 'nanodelay'

import { RemoteStore } from '../index.js'

it('loads store with same ID only once', () => {
  class StoreA extends RemoteStore {
    storeLoading = Promise.resolve()
  }
  class StoreB extends RemoteStore {
    storeLoading = Promise.resolve()
  }
  let storeA1b = StoreA.load('1')
  let storeA1a = StoreA.load('1')
  let storeA2 = StoreA.load('2')
  let storeB1 = StoreB.load('2')
  expect(storeA1a).toBe(storeA1b)
  expect(storeA1a).not.toBe(storeA2)
  expect(storeA1a).not.toBe(storeB1)
})

it('sets store ID', () => {
  class TestStore extends RemoteStore {
    storeLoading = Promise.resolve()
  }
  let store = TestStore.load('ID')
  expect(store.id).toEqual('ID')
})

it('destroys store when all listeners unsubscribed', async () => {
  let events: string[] = []
  class TestStore extends RemoteStore {
    storeLoading = Promise.resolve()

    value = 0

    constructor (id: string) {
      super(id)
      events.push('constructor')
    }

    destroy () {
      events.push('destroy')
    }
  }

  let store = TestStore.load('ID')
  let unbind1 = store.subscribe((changed, diff) => {
    expect(changed).toBe(store)
    events.push('change 1 ' + Object.keys(diff).join(' '))
  })
  let unbind2 = store.subscribe(() => {
    events.push('change 2')
  })

  store.changeKey('value', 1)
  await delay(1)
  unbind1()
  store.changeKey('value', 2)
  await delay(1)

  unbind2()
  expect(TestStore.loaded?.has('ID')).toBe(true)

  let unbind3 = store.subscribe(() => {
    events.push('change 3')
  })
  store.changeKey('value', 4)
  await delay(1)

  unbind3()
  await delay(1)
  expect(TestStore.loaded?.has('ID')).toBe(false)
  expect(events).toEqual([
    'constructor',
    'change 1 value',
    'change 2',
    'change 2',
    'change 3',
    'destroy'
  ])
})

it('supports stores without destroy', async () => {
  class TestStore extends RemoteStore {
    storeLoading = Promise.resolve()
  }
  let store = TestStore.load('ID')
  let unbind = store.subscribe(() => {})
  unbind()
  await delay(1)
  expect(TestStore.loaded?.has('ID')).toBe(false)
})

it('does not allow to change keys', async () => {
  class TestStore extends RemoteStore {
    storeLoading = Promise.resolve()
    value = 0
  }
  let store = TestStore.load('ID')
  store.changeKey('value', 1)
  expect(() => {
    store.value = 2
  }).toThrow(/Cannot assign to read only property 'value'/)
})

it('combines multiple changes for the same store', async () => {
  class TestStore extends RemoteStore {
    storeLoading = Promise.resolve()
    a = 0
    b = 0
    c = 0
    d = 0
  }
  let store = TestStore.load('ID')

  let changes: object[] = []
  store.subscribe((changed, diff) => {
    expect(changed).toBe(store)
    changes.push(diff)
  })

  store.changeKey('a', 1)
  expect(store.a).toEqual(1)
  expect(changes).toEqual([])
  await delay(1)
  expect(changes).toEqual([{ a: 1 }])

  store.changeKey('b', 2)
  store.changeKey('c', 2)
  store.changeKey('c', 3)
  store.changeKey('d', 3)
  await delay(1)
  expect(changes).toEqual([{ a: 1 }, { b: 2, c: 3, d: 3 }])

  store.changeKey('d', 3)
  await delay(1)
  expect(changes).toEqual([{ a: 1 }, { b: 2, c: 3, d: 3 }])
})

it('does not trigger event on request', async () => {
  class TestStore extends RemoteStore {
    storeLoading = Promise.resolve()
    a = 0
    b = 0
  }
  let store = TestStore.load('ID')

  let changes: object[] = []
  store.subscribe((changed, diff) => {
    expect(changed).toBe(store)
    changes.push(diff)
  })

  store.changeKey('a', 1, true)
  await delay(1)
  expect(store.a).toEqual(1)
  expect(changes).toEqual([])

  store.changeKey('b', 1)
  await delay(1)
  expect(changes).toEqual([{ b: 1 }])
})