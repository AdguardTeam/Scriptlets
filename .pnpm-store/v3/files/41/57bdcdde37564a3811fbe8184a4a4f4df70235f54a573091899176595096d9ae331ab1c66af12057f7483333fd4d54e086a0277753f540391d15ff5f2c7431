import { PostHTML } from 'posthtml';
declare function insertAt(options: Options): (tree: PostHTML.Node<import("posthtml").Maybe<string>, import("posthtml").Maybe<Record<string, import("posthtml").Maybe<string>>>>) => void;
export { insertAt };
declare type Options = IInsertAtData | IInsertAtData[];
export interface IInsertAtData {
    selector: string;
    behavior?: 'inside' | 'outside';
    append?: string;
    prepend?: string;
}
