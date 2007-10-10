#!/usr/bin/perl -w
# 
# ***** BEGIN LICENSE BLOCK *****
# 
# Zimbra Collaboration Suite Server
# Copyright (C) 2004, 2005, 2006, 2007 Zimbra, Inc.
# 
# The contents of this file are subject to the Yahoo! Public License
# Version 1.0 ("License"); you may not use this file except in
# compliance with the License.  You may obtain a copy of the License at
# http://www.zimbra.com/license.
# 
# Software distributed under the License is distributed on an "AS IS"
# basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
# 
# ***** END LICENSE BLOCK *****
# 
use strict;
use warnings;
use Getopt::Long;

my %locks;                      # by LockID - hash w/ 'owner','type'
my %threads;           # by threadId - hash w/ 'state' 'waitingOnLock'

my $filename = $ARGV[0];
my ($dumpLocks, $dumpThreads, $searchThreadStack, $searchThreadId, $stackFrames, $sort, $filterByState, $allLocks);

$stackFrames = 10;
$sort = "state";

GetOptions(
           "dl" => \$dumpLocks,
           "dt" => \$dumpThreads,
           "frames=s" => \$stackFrames,
           "sort=s" => \$sort,
           "id=s" => \$searchThreadId,
           "state=s" => \$filterByState,
           "stack=s" => \$searchThreadStack,
           "all" => \$allLocks,
          );

sub dumpLocks();
sub handleThread();
sub dumpThreads();
sub usage();
sub readFile($);

if (!defined $filename) {
  usage();
}
readFile($filename);

if (defined $dumpLocks) {
  dumpLocks();
} elsif (defined $dumpThreads) {
  dumpThreads();
} else {
  usage();
}

exit(0);

sub usage() {
  my $usage = <<END_OF_USAGE;
    
USAGE:
    $0 FILENAME -dl [-frames #_ stack_frames] [-id REGEXP] [-all]
    $0 FILENAME -dt [-frames #_ stack_frames] [-sort id|state] [-stack REGEXP] [-id REGEXP] [-state REGEXP]

    frames:  controls the # lines of stack trace included in the output
    id:      only include where the id matches REGEXP

    all:     include ALL locks (not just ones that other threads are blocked-on)

    sort:    controls the order threads are printed out (locks always printed in lock ID order)
    stack:   only include threads where the thread's stack output matches REGEXP
    state:   only include threads where the thread state (e.g. RUNNABLE) matches REGEXP

 Examples:

    $0 threads.txt -dt -stack MailboxIndex.java -state RUNNABLE -f 20
        -- dumps all RUNNABLE threads with MailboxIndex.java on the stack (1st 20 lines of the stack)

    $0 threads.txt -dl -f 0
        -- dumps the list of locks in the system that are blocking at least one thread

    $0 threads.txt -dt -f 0 -sort state
        -- dumps a list of all the threads in the system and tells you their run state
    

END_OF_USAGE
  die $usage;
}

sub mySort($$) {
  my ($a, $b) = @_;
  if ($sort eq "state") {
    my $state1 = $threads{$a}{state};
    my $state2 = $threads{$b}{state};
    if (!defined $state1) {
      return 1;
    } elsif (!defined $state2) {
      return -1;
    }
    return $state1 cmp $state2;
  } else {
    return $a cmp $b;
  }
}

sub padToWidth($$) {
  (my $str, my $width) = @_;
  if (!defined($str)) {
    $str = "";
  }
  return sprintf "%-".$width.".".$width."s", $str;
}

sub formatStackTrace($$) {
  my ($stack, $indent) = @_;
  my $ret;
  if ($stackFrames == 0) { return ""; }
  my $num = $stackFrames;
  
  foreach my $line (split /\n/, $stack) {
    if ($num <= 0) {
      return $ret;
    }
    $ret .= $indent.$line."\n";
    $num--;
  }
  return $ret;
}

sub formatLock($) {
  my $lockId = shift;
  my $output = "$lockId - ";
  for my $data (keys %{ $locks{$lockId}}) {
    $output .= " $data=";
    $output .= $locks{$lockId}{$data};
  }
  return $output;
}

sub formatThread($) {
  my $threadId = shift;
  my $ret = padToWidth($threadId, 50).$threads{$threadId}{state}."\n";
  if (defined $threads{$threadId}{waitingOnLock}) {
    $ret .= "\tWaiting for: ".$threads{$threadId}{waitingOnLock}.formatLock($threads{$threadId}{waitingOnLock})."\n";
  }
  $ret .= formatStackTrace($threads{$threadId}{stack}, "\t  ");
  if ($stackFrames > 0) {
    $ret .= "\n";
  }
  return $ret;
}

sub dumpLocks() {
  foreach my $lockId ( sort keys %locks ) {
    my $ret = "";
    my $numWaiters = 0;
    $ret .=  "LOCK: $lockId   ";
    for my $data (keys %{ $locks{$lockId}}) {
      $ret .=  "$data=";
      $ret .=  $locks{$lockId}{$data};
      $ret .=  ", ";
    }
    $ret .= "\n";
    foreach my $threadId ( keys %threads ) {
      if (defined $threads{$threadId}{waitingOnLock}) {
        if ($threads{$threadId}{waitingOnLock} eq $lockId) {
          $ret .= "\tThread $threadId is waiting for this lock\n";
          $numWaiters++;
        }
      }
    }
    $ret .= formatStackTrace($threads{$locks{$lockId}{owner}}{stack}, "\t");

    if ((!defined $searchThreadId) || ($lockId =~ /$searchThreadId/)) {
      if ($numWaiters > 0 || defined $allLocks) {
        if ($stackFrames > 0) {
          $ret .= "\n";
        }
        print $ret;
      }
    }
  }
}

sub dumpThreads() {
  foreach my $threadId ( sort { mySort($a, $b) } keys %threads ) {
    if (defined $searchThreadStack && !($threads{$threadId}{stack} =~ /$searchThreadStack/)) {
      # continue
    } elsif (defined $searchThreadId && !($threadId =~ /$searchThreadId/)) {
      # continue
    } elsif (defined $filterByState && !($threads{$threadId}{state} =~ /$filterByState/)) {
      # continue
    } else {
      print formatThread($threadId);
    }
  }
}

sub readFile($) {
  my $filename = shift;
  
  open IN, "<$filename" or die "couldn't open $filename";
  
  my @curThread;
  
  while (<>) {
    chomp;
    if ($_ eq "") {
      if (@curThread) {
        my $threadId;
        my @locksHeld;
        my $waitingOnLock;
        my $threadState;
        my $output;
        
        # 1stline
        my $line = shift @curThread;
        $output .= $line."\n";
        if ($line =~ /"(.*)"/) {
          $threadId = $1;
        } else {
          $threadId = $line;
        }
        
        # 2nd line
        $line = shift @curThread;
        if (defined $line) {
          $output .= $line."\n";
          if ($line =~ /State: ([A-Z_]+)/) {
            $threadState = $1;
            $threads{$threadId}{state} = $1;
          }
          
          foreach $line (@curThread) {
            $output .= $line."\n";
            if ($line =~ /locked <(0x[0-9a-f]+)>\s?(.*)?/) {
              push @locksHeld, $1;
              
              $locks{$1}{owner} = $threadId;
              $locks{$1}{type} = $2;
              
            } elsif ($line =~ /- waiting to lock <(0x[0-9a-f]+)>/) {
              $waitingOnLock = $1;
              $threads{$threadId}{waitingOnLock} = $1;
            }
          }
        } else {
          $threads{$threadId}{state} = "unknown"
        }
        
        $threads{$threadId}{stack} = $output;
        undef @curThread;
      }
    } else {
      push @curThread, $_;
    }
  }
  
  close IN;
}


