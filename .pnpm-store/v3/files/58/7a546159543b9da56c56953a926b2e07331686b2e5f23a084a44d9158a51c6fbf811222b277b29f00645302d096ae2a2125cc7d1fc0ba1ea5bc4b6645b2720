import { PostHTML } from 'posthtml';
import { IInsertAtData } from './insertAt';
declare function insertNode({ node, option }: IInsertNodeParams): {
    content: (string | PostHTML.Node<import("posthtml").Maybe<string>, import("posthtml").Maybe<Record<string, import("posthtml").Maybe<string>>>>)[];
    walk: (cb: PostHTML.NodeCallback<import("posthtml").Maybe<string>, import("posthtml").Maybe<Record<string, import("posthtml").Maybe<string>>>>) => PostHTML.Node<import("posthtml").Maybe<string>, import("posthtml").Maybe<Record<string, import("posthtml").Maybe<string>>>>;
    match: <TTag extends string | RegExp, TAttrs extends import("posthtml").Maybe<Record<string, string | RegExp>>, TTagResult extends import("posthtml").Maybe<string> = TTag extends string ? TTag : TTag extends void ? import("posthtml").Maybe<string> : string, TAttrResult extends import("posthtml").Maybe<Record<string, import("posthtml").Maybe<string>>> = TAttrs extends void ? import("posthtml").Maybe<Record<string, import("posthtml").Maybe<string>>> : { [P in keyof TAttrs]: string; } & Record<string, import("posthtml").Maybe<string>>>(expression: import("posthtml").MaybeArray<PostHTML.Matcher<TTag, TAttrs>>, cb: PostHTML.NodeCallback<TTagResult, TAttrResult>) => PostHTML.Node<TTagResult, TAttrResult>[];
    tag: import("posthtml").Maybe<string>;
    attrs: import("posthtml").Maybe<Record<string, import("posthtml").Maybe<string>>>;
};
interface IInsertNodeParams {
    node: PostHTML.Node;
    option: IInsertAtData;
    content: [undefined | PostHTML.RawNode[] | unknown];
}
export { insertNode };
