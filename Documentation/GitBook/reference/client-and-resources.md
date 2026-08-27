# Client and resources

`JanuaryPartnerClient` is the public entry point. Its generated OpenAPI transport
is an implementation detail.

| Resource | Methods |
| --- | --- |
| `foods` | `autocomplete`, `search`, `getFood`, `lookupBarcode`, `searchNaturalLanguage`, `suggestAlternatives` |
| `restaurants` | `search`, `searchMenuItems` |
| `photoScanning` | `scan`, `correct` |
| `foodLogs` | `create`, `list`, `update`, `delete` |
| `glucose` | `predict` |

`forUser` returns a lightweight `JanuaryPartnerUserClient` for scoped Food Logs
and Glucose calls. Every request accepts an optional `AbortSignal`. The public
client always targets January production; there is no public base-URL option.
