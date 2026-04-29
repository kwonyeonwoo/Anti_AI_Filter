def factorial(n):
    if n < 0:
        raise ValueError("Factorial is not defined for negative numbers")
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result

if __name__ == "__main__":
    import sys
    test_val = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    print(f"factorial({test_val}) = {factorial(test_val)}")
