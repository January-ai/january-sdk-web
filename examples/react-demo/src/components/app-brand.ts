export interface AppBrand {
  name: string
  monogram: string
  productLabel: string
  environmentLabel: string
  apiVersion: string
  documentationUrl: string
}

// White-label partners can replace this object and the CSS variables in styles.css
// without changing feature routes or shared components.
export const appBrand: Readonly<AppBrand> = Object.freeze({
  name: 'January',
  monogram: 'J',
  productLabel: 'Partner API Lab',
  environmentLabel: 'Development workspace',
  apiVersion: 'v1.2',
  documentationUrl: 'https://docs.january.ai/nutrition/apis/v1.2/',
})
