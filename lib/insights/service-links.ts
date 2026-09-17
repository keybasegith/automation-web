import type { RelatedService } from "./types";
const topics:[RegExp,string,string][]=[
 [/\b(rrsp|rrif|pension|retire)/i,"retirement-planning","Retirement planning"],
 [/\btfsa\b/i,"tfsa","Tax-Free Savings Accounts"],
 [/\bfhsa\b|first.home/i,"fhsa","First Home Savings Accounts"],
 [/\brrsp\b/i,"rrsp","Registered Retirement Savings Plans"],
 [/\bresp\b|education/i,"resp","Registered Education Savings Plans"],
 [/estate|inherit|legacy/i,"estate-planning","Estate and legacy planning"],
 [/insurance/i,"insurance","Insurance planning"],
 [/invest|market|interest|inflation/i,"traditional-investments","Investment solutions"],
 [/tax/i,"tax-planning","Tax planning"],
];
export function relatedServicesFor(text:string): RelatedService[] {
 const matches=topics.filter(([pattern])=>pattern.test(text)).slice(0,3).map(([,slug,label])=>({href:`/${slug}`,label}));
 return matches.length ? matches : [{href:"/wealth-building",label:"Wealth building and financial planning"}];
}
