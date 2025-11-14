#!/usr/bin/env python3
"""
Test Runner Script
Runs all tests sequentially with proper rate limit management
"""

import subprocess
import sys
import time
from datetime import datetime


class TestRunner:
    """Manages test execution with rate limit awareness"""
    
    def __init__(self):
        self.results = []
        self.start_time = None
        self.end_time = None
    
    def run_command(self, cmd, description):
        """Run a command and capture results"""
        print(f"\n{'='*70}")
        print(f"🧪 {description}")
        print(f"{'='*70}")
        
        start = time.time()
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=False,  # Show output in real-time
            text=True
        )
        duration = time.time() - start
        
        self.results.append({
            "description": description,
            "command": cmd,
            "exit_code": result.returncode,
            "duration": duration,
            "passed": result.returncode == 0
        })
        
        return result.returncode == 0
    
    def run_all_tests(self):
        """Run the complete test suite"""
        self.start_time = datetime.now()
        
        print("\n" + "="*70)
        print("🚀 Starting Test Suite")
        print(f"⏰ Started at: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*70)
        
        # Test configurations
        tests = [
            {
                "cmd": "pytest tests/ -v --tb=short",
                "description": "All Tests (with rate limit management)"
            },
            {
                "cmd": "pytest tests/test_performance.py -v",
                "description": "Performance Tests Only"
            },
            {
                "cmd": "pytest tests/test_performance.py::TestPerformance::test_multiple_sequential_requests -v -s",
                "description": "Sequential Requests Test (detailed)"
            }
        ]
        
        # Run each test
        for test in tests:
            success = self.run_command(test["cmd"], test["description"])
            if not success:
                print(f"\n⚠️  Test failed but continuing with remaining tests...")
        
        self.end_time = datetime.now()
        self.print_summary()
    
    def run_performance_only(self):
        """Run only performance tests"""
        self.start_time = datetime.now()
        
        print("\n" + "="*70)
        print("🚀 Running Performance Tests")
        print(f"⏰ Started at: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*70)
        
        self.run_command(
            "pytest tests/test_performance.py -v -s",
            "Performance Test Suite"
        )
        
        self.end_time = datetime.now()
        self.print_summary()
    
    def run_stress_test(self, iterations=5):
        """Run performance tests multiple times to test rate limiting"""
        self.start_time = datetime.now()
        
        print("\n" + "="*70)
        print(f"🔥 Stress Test: Running performance tests {iterations} times")
        print(f"⏰ Started at: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*70)
        
        for i in range(1, iterations + 1):
            self.run_command(
                "pytest tests/test_performance.py::TestPerformance::test_multiple_sequential_requests -v",
                f"Iteration {i}/{iterations}"
            )
        
        self.end_time = datetime.now()
        self.print_summary()
    
    def print_summary(self):
        """Print test execution summary"""
        total_duration = (self.end_time - self.start_time).total_seconds()
        passed = sum(1 for r in self.results if r["passed"])
        failed = len(self.results) - passed
        
        print("\n" + "="*70)
        print("📊 TEST SUMMARY")
        print("="*70)
        
        for i, result in enumerate(self.results, 1):
            status = "✅ PASS" if result["passed"] else "❌ FAIL"
            print(f"{i}. {status} - {result['description']}")
            print(f"   Duration: {result['duration']:.2f}s")
        
        print("\n" + "-"*70)
        print(f"Total Tests: {len(self.results)}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Total Duration: {total_duration:.2f}s")
        print(f"Finished at: {self.end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*70 + "\n")
        
        # Exit with error code if any tests failed
        if failed > 0:
            sys.exit(1)


def main():
    """Main entry point"""
    runner = TestRunner()
    
    # Parse command line arguments
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "all":
            runner.run_all_tests()
        elif command == "performance":
            runner.run_performance_only()
        elif command == "stress":
            iterations = int(sys.argv[2]) if len(sys.argv) > 2 else 5
            runner.run_stress_test(iterations)
        else:
            print("Usage:")
            print("  python run_tests.py all          # Run all tests")
            print("  python run_tests.py performance  # Run performance tests only")
            print("  python run_tests.py stress [N]   # Run performance tests N times (default: 5)")
            sys.exit(1)
    else:
        # Default: run all tests
        runner.run_all_tests()


if __name__ == "__main__":
    main()
