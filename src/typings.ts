import type { WILDCARD } from "./symbols.js";

export type LowercaseCombinationOperator = "or" | "and" | "and_not";

export type CombinationOperator =
  | LowercaseCombinationOperator
  | Uppercase<LowercaseCombinationOperator>
  | Capitalize<LowercaseCombinationOperator>;

export type SerializedIndexEntry = Record<string, number>;

/**
 * Parameters of the BM25+ scoring algorithm. Customizing these is almost never
 * necessary, and fine-tuning them requires an understanding of the BM25 scoring
 * model.
 *
 * Some information about BM25 (and BM25+) can be found at these links:
 *
 * - https://en.wikipedia.org/wiki/Okapi_BM25
 * - https://opensourceconnections.com/blog/2015/10/16/bm25-the-next-generation-of-lucene-relevation/
 */
export interface BM25Params {
  /** Term frequency saturation point.
   *
   * Recommended values are between `1.2` and `2`. Higher values increase the
   * difference in score between documents with higher and lower term
   * frequencies. Setting this to `0` or a negative value is invalid. Defaults
   * to `1.2`
   */
  k: number;

  /**
   * Length normalization impact.
   *
   * Recommended values are around `0.75`. Higher values increase the weight
   * that field length has on scoring. Setting this to `0` (not recommended)
   * means that the field length has no effect on scoring. Negative values are
   * invalid. Defaults to `0.7`.
   */
  b: number;

  /**
   * BM25+ frequency normalization lower bound (usually called δ).
   *
   * Recommended values are between `0.5` and `1`. Increasing this parameter
   * increases the minimum relevance of one occurrence of a search term
   * regardless of its (possibly very long) field length. Negative values are
   * invalid. Defaults to `0.5`.
   */
  d: number;
}

/**
 * Match information for a search result. It is a key-value object where keys
 * are terms that matched, and values are the list of fields that the term was
 * found in.
 */
export type MatchInfo = Record<string, string[]>;

/**
 * Type of the search results. Each search result indicates the document ID, the
 * terms that matched, the match information, the score, and all the stored
 * fields.
 *
 * @typeParam ID  The type of id being indexed.
 * @typeParam Index The type of the documents being indexed.
 */
export type SearchResult<
  ID = any,
  Index extends Record<string, any> = Record<never, never>,
> = Index & {
  /**
   * The document ID
   */
  id: ID;

  /**
   * List of document terms that matched. For example, if a prefix search for
   * `"moto"` matches `"motorcycle"`, `terms` will contain `"motorcycle"`.
   */
  terms: string[];

  /**
   * List of query terms that matched. For example, if a prefix search for
   * `"moto"` matches `"motorcycle"`, `queryTerms` will contain `"moto"`.
   */
  queryTerms: string[];

  /**
   * Score of the search results
   */
  score: number;

  /**
   * Match information, see {@link MatchInfo}
   */
  match: MatchInfo;
};

/**
 * Search options to customize the search behavior.
 *
 * @typeParam ID  The type of id being indexed.
 * @typeParam Index The type of the documents being indexed.
 */
export interface SearchOptions<
  ID = any,
  Index extends Record<string, any> = Record<never, never>,
> {
  /**
   * Names of the fields to search in. If omitted, all fields are searched.
   */
  fields?: string[];

  /**
   * Function used to filter search results, for example on the basis of stored
   * fields. It takes as argument each search result and should return a boolean
   * to indicate if the result should be kept or not.
   */
  filter?: (result: SearchResult<ID, Index>) => boolean;

  /**
   * Key-value object of field names to boosting values. By default, fields are
   * assigned a boosting factor of 1. If one assigns to a field a boosting value
   * of 2, a result that matches the query in that field is assigned a score
   * twice as high as a result matching the query in another field, all else
   * being equal.
   */
  boost?: Record<string, number>;

  /**
   * Function to calculate a boost factor for each term.
   *
   * This function, if provided, is called for each query term (as split by
   * `tokenize` and processed by `processTerm`). The arguments passed to the
   * function are the query term, the positional index of the term in the query,
   * and the array of all query terms. It is expected to return a numeric boost
   * factor for the term. A factor lower than 1 reduces the importance of the
   * term, a factor greater than 1 increases it. A factor of exactly 1 is
   * neutral, and does not affect the term's importance.
   */
  boostTerm?: (term: string, i: number, terms: string[]) => number;

  /**
   * Relative weights to assign to prefix search results and fuzzy search
   * results. Exact matches are assigned a weight of 1.
   */
  weights?: { fuzzy?: number; prefix?: number };

  /**
   * Function to calculate a boost factor for documents. It takes as arguments
   * the document ID, and a term that matches the search in that document, and
   * the value of the stored fields for the document (if any).  It should return
   * a boosting factor: a number higher than 1 increases the computed score, a
   * number lower than 1 decreases the score, and a falsy value skips the search
   * result completely.
   */
  boostDocument?: (
    documentId: ID,
    term: string,
    storedFields?: Index,
  ) => number;

  /**
   * Controls whether to perform prefix search. It can be a simple boolean, or a
   * function.
   *
   * If a boolean is passed, prefix search is performed if true.
   *
   * If a function is passed, it is called upon search with a search term, the
   * positional index of that search term in the tokenized search query, and the
   * tokenized search query. The function should return a boolean to indicate
   * whether to perform prefix search for that search term.
   */
  prefix?:
    | boolean
    | ((term: string, index: number, terms: string[]) => boolean);

  /**
   * Controls whether to perform fuzzy search. It can be a simple boolean, or a
   * number, or a function.
   *
   * If a boolean is given, fuzzy search with a default fuzziness parameter is
   * performed if true.
   *
   * If a number higher or equal to 1 is given, fuzzy search is performed, with
   * a maximum edit distance (Levenshtein) equal to the number.
   *
   * If a number between 0 and 1 is given, fuzzy search is performed within a
   * maximum edit distance corresponding to that fraction of the term length,
   * approximated to the nearest integer. For example, 0.2 would mean an edit
   * distance of 20% of the term length, so 1 character in a 5-characters term.
   * The calculated fuzziness value is limited by the `maxFuzzy` option, to
   * prevent slowdown for very long queries.
   *
   * If a function is passed, the function is called upon search with a search
   * term, a positional index of that term in the tokenized search query, and
   * the tokenized search query. It should return a boolean or a number, with
   * the meaning documented above.
   */
  fuzzy?:
    | boolean
    | number
    | ((term: string, index: number, terms: string[]) => boolean | number);

  /**
   * Controls the maximum fuzziness when using a fractional fuzzy value.
   * Very high edit distances usually don't produce meaningful results,
   * but can excessively impact search performance.
   *
   * @default 6
   */
  maxFuzzy?: number;

  /**
   * The operand to combine partial results for each term. By default it is
   * "OR", so results matching _any_ of the search terms are returned by a
   * search. If "AND" is given, only results matching _all_ the search terms are
   * returned by a search.
   */
  combineWith?: CombinationOperator;

  /**
   * Function to tokenize the search query. By default, the same tokenizer used
   * for indexing is used also for search.
   */
  tokenize?: (text: string) => string[];

  /**
   * Function to process or normalize terms in the search query. By default, the
   * same term processor used for indexing is used also for search.
   */
  processTerm?: (term: string) => string | string[] | null | undefined | false;

  /**
   * BM25+ algorithm parameters. Customizing these is almost never necessary,
   * and fine-tuning them requires an understanding of the BM25 scoring model. In
   * most cases, it is best to omit this option to use defaults, and instead use
   * boosting to tweak scoring for specific use cases.
   */
  bm25?: BM25Params;
}

/**
 * Configuration options passed to the {@link SearchIndex} constructor
 *
 * @typeParam ID  The type of id being indexed.
 * @typeParam Document  The type of documents being indexed.
 * @typeParam Index The type of the documents being indexed.
 */
export interface SearchIndexOptions<
  ID = any,
  Document = any,
  Index extends Record<string, any> = Record<never, never>,
> {
  /**
   * Names of the document fields to be indexed.
   */
  fields: string[];

  /**
   * Name of the ID field, uniquely identifying a document.
   */
  idField?: string;

  /**
   * Names of fields to store, so that search results would include them. By
   * default none, so results would only contain the id field.
   */
  storeFields?: string[];

  /**
   * Function used to extract the value of each field in documents. By default,
   * the documents are assumed to be plain objects with field names as keys,
   * but by specifying a custom `extractField` function one can completely
   * customize how the fields are extracted.
   *
   * The function takes as arguments the document, and the name of the field to
   * extract from it. It should return the field value as a string.
   */
  extractField?: (document: Document, fieldName: string) => string;

  /**
   * Function used to split a field value into individual terms to be indexed.
   * The default tokenizer separates terms by space or punctuation, but a
   * custom tokenizer can be provided for custom logic.
   *
   * The function takes as arguments string to tokenize, and the name of the
   * field it comes from. It should return the terms as an array of strings.
   * When used for tokenizing a search query instead of a document field, the
   * `fieldName` is undefined.
   */
  tokenize?: (text: string, fieldName?: string) => string[];

  /**
   * Function used to process a term before indexing or search. This can be
   * used for normalization (such as stemming). By default, terms are
   * downcased, and otherwise no other normalization is performed.
   *
   * The function takes as arguments a term to process, and the name of the
   * field it comes from. It should return the processed term as a string, or a
   * falsy value to reject the term entirely.
   *
   * It can also return an array of strings, in which case each string in the
   * returned array is indexed as a separate term.
   */
  processTerm?: (
    term: string,
    fieldName?: string,
  ) => string | string[] | null | undefined | false;

  /**
   * Function called to log messages. Arguments are a log level ('debug',
   * 'info', 'warn', or 'error'), a log message, and an optional string code
   * that identifies the reason for the log.
   *
   * The default implementation uses `console`, if defined.
   */
  logger?: (level: LogLevel, message: string, code?: string) => void;

  /**
   * If `true` (the default), vacuuming is performed automatically as soon as
   * {@link discard} is called a certain number of times, cleaning up
   * obsolete references from the index. If `false`, no automatic vacuuming is
   * performed. Custom settings controlling auto vacuuming thresholds, as well
   * as batching behavior, can be passed as an object (see the
   * {@link AutoVacuumOptions} type).
   */
  autoVacuum?: boolean | AutoVacuumOptions;

  /**
   * Default search options (see the {@link SearchOptions} type and the
   * {@link search} method for details)
   */
  searchOptions?: SearchOptions<ID, Index>;

  /**
   * Default auto suggest options (see the {@link SearchOptions} type and the
   * {@link autoSuggest} method for details)
   */
  autoSuggestOptions?: SearchOptions<ID, Index>;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * The type of auto-suggestions
 */
export interface Suggestion {
  /**
   * The suggestion
   */
  suggestion: string;

  /**
   * Suggestion as an array of terms
   */
  terms: string[];

  /**
   * Score for the suggestion
   */
  score: number;
}

/**
 * Object format of search index when serialized
 *
 * @typeParam Index The type of the documents being indexed.
 */
export interface IndexObject<
  Index extends Record<string, any> = Record<never, never>,
> {
  documentCount: number;
  nextId: number;
  documentIds: Record<string, any>;
  fieldIds: Record<string, number>;
  fieldLength: Record<string, number[]>;
  averageFieldLength: number[];
  storedFields: Record<string, Index>;
  dirtCount?: number;
  index: [string, Record<string, SerializedIndexEntry>][];
  version: number;
}

/**
 * @typeParam ID  The type of id being indexed.
 * @typeParam Index The type of the documents being indexed.
 */
export interface QueryCombination<
  ID = any,
  Index extends Record<string, any> = Record<never, never>,
> extends SearchOptions<ID, Index> {
  queries: Query[];
}

/**
 * Wildcard query, used to match all terms
 */
export type Wildcard = typeof WILDCARD;

/**
 * Search query expression, either a query string or an expression tree
 * combining several queries with a combination of AND or OR.
 */
export type Query = QueryCombination | string | Wildcard;

/**
 * Options to control vacuuming behavior.
 *
 * Vacuuming cleans up document references made obsolete by
 * {@link discard} from the index. On large indexes, vacuuming is
 * potentially costly, because it has to traverse the whole inverted index.
 * Therefore, in order to dilute this cost so it does not negatively affects the
 * application, vacuuming is performed in batches, with a delay between each
 * batch. These options are used to configure the batch size and the delay
 * between batches.
 */
export interface VacuumOptions {
  /**
   * Size of each vacuuming batch (the number of terms in the index that will be
   * traversed in each batch).
   *
   * @default 1000
   */
  batchSize?: number;

  /**
   * Wait time between each vacuuming batch in milliseconds.
   *
   * @default 10
   */
  batchWait?: number;
}

/**
 * Sets minimum thresholds for `dirtCount` and `dirtFactor` that trigger an
 * automatic vacuuming.
 */
export interface VacuumConditions {
  /**
   * Minimum `dirtCount` (number of discarded documents since the last vacuuming)
   * under which auto vacuum is not triggered.
   *
   * @default 20
   */
  minDirtCount?: number;

  /**
   * Minimum `dirtFactor` (proportion of discarded documents over the total)
   * under which auto vacuum is not triggered.
   *
   * @default 0.1
   */
  minDirtFactor?: number;
}

/**
 * Options to control auto vacuum behavior. When discarding a document with
 * {@link discard}, a vacuuming operation is automatically started if the
 * `dirtCount` and `dirtFactor` are above the `minDirtCount` and `minDirtFactor`
 * thresholds defined by this configuration. See {@link VacuumConditions} for
 * details on these.
 *
 * Also, `batchSize` and `batchWait` can be specified, controlling batching
 * behavior (see {@link VacuumOptions}).
 */
export type AutoVacuumOptions = VacuumOptions & VacuumConditions;
