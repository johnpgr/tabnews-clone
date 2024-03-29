import { useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { formatDistance } from "date-fns";
import { trpc } from "~/utils/trpc";
import { useSession } from "next-auth/react";
import Markdown from "markdown-to-jsx";
import { useAtom } from "jotai";
import { PostIdAtom } from "~/pages/[userName]/[slug]";
import Link from "next/link";
import { ptBR } from "date-fns/locale";
import { Likes } from "../Likes";
import { BsThreeDots } from "react-icons/bs";
import Dropdown from "../headlessui/Dropdown";
import { Menu } from "@headlessui/react";
import type { CommentWithChildren } from "./types";
import { useRouter } from "next/router";
import { CommentEditor } from "../Editor/CommentEditor";
import dynamic from "next/dynamic";

function Comment({
    id,
    children,
    content,
    createdAt,
    authorId,
    author,
    likes,
    hasBeenEdited,
}: CommentWithChildren) {
    const session = useSession();
    const trpcContext = trpc.useContext();
    const router = useRouter();
    const [postId] = useAtom(PostIdAtom);
    const [autoAnimate] = useAutoAnimate<HTMLLIElement>();
    const [isCommenting, setIsCommenting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    function handleInvalidateComments() {
        trpcContext.comments.list.invalidate({ postId });
    }

    const { mutate: likeComment } = trpc.likes.addToComment.useMutation({
        onSuccess: handleInvalidateComments,
    });

    const { mutate: unlikeComment } = trpc.likes.removeFromComment.useMutation({
        onSuccess: handleInvalidateComments,
    });

    const { mutate: deleteComment } = trpc.comments.delete.useMutation({
        onSuccess: handleInvalidateComments,
    });

    function handleAddLike() {
        if (session.status === "unauthenticated") {
            router.push("/login");
            return;
        }
        likeComment({ commentId: id });
    }

    function handleRemoveLike() {
        if (session.status === "unauthenticated") {
            router.push("/login");
            return;
        }
        unlikeComment({ commentId: id });
    }

    function handleDeleteComment() {
        if (session.status === "unauthenticated") {
            router.push("/login");
            return;
        }
        deleteComment({ commentId: id });
    }

    function handleEditComment() {
        if (session.status === "unauthenticated") {
            router.push("/login");
            return;
        }
        setIsCommenting(true);
        setIsUpdating(true);
    }

    const isOwner = session?.data?.user?.id === authorId;
    const userHasLiked =
        likes?.some((like) => like.userId === session?.data?.user?.id) ?? false;

    const PreBlock = dynamic(() => import("../Editor/Code"), { ssr: false });

    return (
        <div className="flex">
            <Likes
                handleAddLike={handleAddLike}
                handleRemoveLike={handleRemoveLike}
                likesCount={likes?.length ?? 0}
                userHasLiked={userHasLiked}
            />
            <li ref={autoAnimate} className="flex flex-1 flex-col gap-2">
                <div className="flex items-center gap-1">
                    <Link
                        href={`/${author.username}`}
                        className="mono rounded-md bg-[#ddf4ff] px-2 py-1 text-xs text-blue-500"
                    >
                        {author.username}
                    </Link>{" "}
                    <span className="text-xs text-zinc-600">
                        {formatDistance(new Date(createdAt), new Date(), {
                            locale: ptBR,
                        })}
                    </span>
                    <span className="text-xs text-zinc-600">
                        {hasBeenEdited && "(editado)"}
                    </span>
                    {isOwner && (
                        <div className="ml-auto inline">
                            <Dropdown
                                button={
                                    <BsThreeDots className="mt-1 mr-2 sm:mr-0" />
                                }
                            >
                                <div className="flex w-full flex-col gap-1 py-2 text-sm">
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={handleEditComment}
                                                className={`mx-2 flex items-center gap-2 rounded-md px-2 py-1 ${
                                                    active && "bg-gray-100"
                                                }`}
                                            >
                                                Editar comentário
                                            </button>
                                        )}
                                    </Menu.Item>
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={handleDeleteComment}
                                                className={`mx-2 flex items-center gap-2 rounded-md px-2 py-1 ${
                                                    active && "bg-gray-100"
                                                }`}
                                            >
                                                Excluir comentário
                                            </button>
                                        )}
                                    </Menu.Item>
                                </div>
                            </Dropdown>
                        </div>
                    )}
                </div>

                <div className="prose prose-code:rounded-lg prose-code:bg-gray-200 prose-code:py-1 prose-code:px-2 prose-code:before:content-none prose-code:after:content-none">
                    <Markdown
                        options={{
                            disableParsingRawHTML: true,
                            overrides: {
                                pre: PreBlock,
                            },
                        }}
                    >
                        {content}
                    </Markdown>
                </div>
                {isUpdating ? (
                    <CommentEditor
                        isCommenting={isCommenting}
                        setIsCommenting={setIsCommenting}
                        setIsUpdating={setIsUpdating}
                        commentIdToUpdate={id}
                        contentToUpdate={content}
                    />
                ) : (
                    <CommentEditor
                        isCommenting={isCommenting}
                        setIsCommenting={setIsCommenting}
                        setIsUpdating={setIsUpdating}
                        parentId={id}
                    />
                )}
                {children && children.length > 0 && (
                    <CommentList comments={children} />
                )}
            </li>
        </div>
    );
}

export function CommentList({ comments }: { comments: CommentWithChildren[] }) {
    const [autoAnimate] = useAutoAnimate<HTMLUListElement>();
    return (
        <ul className="flex flex-col gap-5" ref={autoAnimate}>
            {comments?.map((comment) => (
                <Comment key={comment.id} {...comment} />
            ))}
        </ul>
    );
}
