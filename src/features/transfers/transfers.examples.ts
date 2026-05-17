export const REJECTED_EVENT_EXAMPLE = {
  index: 2,
  event_id: 'evt-bad',
  errors: ['amount must not be less than 0'],
};

export const INSERT_RESULT_EXAMPLE = {
  inserted: 7,
  duplicates: 3,
  rejected: [REJECTED_EVENT_EXAMPLE],
};
