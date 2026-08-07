"use client";

interface ConfirmSubmitButtonProps {
  message: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * 감싸고 있는 폼을 제출하기 전에 확인 한 단계를 끼운다.
 * 이 버튼만 클라이언트로 내보내면 되므로 목록 전체를 클라이언트 컴포넌트로
 * 만들 필요가 없다. 실행할 액션은 폼의 action이 정한다.
 */
export default function ConfirmSubmitButton({
  message,
  className,
  children,
}: ConfirmSubmitButtonProps) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      className={className}
    >
      {children}
    </button>
  );
}
