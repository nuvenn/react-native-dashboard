/* @flow */

const apiHost = 'https://mc.commercetools.com'
const loginUrl = `${apiHost}/tokens`
const projectsByUserUrl = `${apiHost}/projects`

export function login (options) {
  return fetch(
    loginUrl,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: options.email,
        password: options.password,
      }),
    },
  ).then(processResponse)
}

export function getProjectsForUser (options) {
  return fetch(
    `${projectsByUserUrl}?userId=${options.userId}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: options.token,
        'Content-Type': 'application/json',
      },
    },
  ).then(processResponse)
}

// Fetch some meta information to show in the dashboard (all related to today):
// - number of open + complete orders
// - number of active + ordered carts
// - tot number of customers
export function statistics (options) {
  const ordersUrl = `${apiHost}/${options.projectKey}/orders`
  const cartsUrl = `${apiHost}/${options.projectKey}/carts`

  const requestOptions = {
    headers: {
      Accept: 'application/json',
      Authorization: options.token,
      'Content-Type': 'application/json',
    },
  }

  return Promise.all([
    // Fetch "total" orders
    fetch(
      `${ordersUrl}?${getStatisticsQueryForPredicate()}`,
      requestOptions,
    ).then(processResponse),

    // Fetch "open" orders
    fetch(
      `${ordersUrl}?${getStatisticsQueryForPredicate('orderState = "Open"')}`,
      requestOptions,
    ).then(processResponse),

    // Fetch "complete" orders
    fetch(
      // eslint-disable-next-line max-len
      `${ordersUrl}?${getStatisticsQueryForPredicate('orderState = "Complete"')}`,
      requestOptions,
    ).then(processResponse),

    // Fetch "total" carts
    fetch(
      `${cartsUrl}?${getStatisticsQueryForPredicate()}`,
      requestOptions,
    ).then(processResponse),

    // Fetch "active" carts
    fetch(
      `${cartsUrl}?${getStatisticsQueryForPredicate('cartState = "Active"')}`,
      requestOptions,
    ).then(processResponse),

    // Fetch "active" carts
    fetch(
      `${cartsUrl}?${getStatisticsQueryForPredicate('cartState = "Ordered"')}`,
      requestOptions,
    ).then(processResponse),
  ])
  .then(
    ([
      totalOrdersResponse,
      openOrdersResponse,
      completeOrdersResponse,
      totalCartsResponse,
      activeCartsResponse,
      orderedCartsResponse,
    ]) => ({
      orders: {
        total: totalOrdersResponse.total,
        open: openOrdersResponse.total,
        complete: completeOrdersResponse.total,
      },
      carts: {
        total: totalCartsResponse.total,
        active: activeCartsResponse.total,
        ordered: orderedCartsResponse.total,
      },
    }),
  )
}


// Private methods

function getTodayISOString () {
  const date = new Date()
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // month starts with index `0`
  const day = date.getUTCDate()

  return `${year}-${month}-${day}`
}

function getStatisticsQueryForPredicate (predicate) {
  const todayPredicate = `createdAt > "${getTodayISOString()}"`
  const queryPredicate = predicate
    ? encodeURIComponent(`${todayPredicate} and ${predicate}`)
    : encodeURIComponent(todayPredicate)

  return `limit=0&where=${queryPredicate}`
}

function processResponse (response) {
  let isOk = response.ok

  return response.text()
  .then((text) => {
    let parsed
    try { parsed = JSON.parse(text) } catch (error) { isOk = false }

    if (isOk) return parsed

    // loggers.app.info(response.headers.raw())

    const error = new Error(parsed ? parsed.message : text)

    if (parsed) error.body = parsed

    throw error
  })
}